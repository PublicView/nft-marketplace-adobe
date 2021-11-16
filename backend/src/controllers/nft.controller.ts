// Uncomment these imports to begin using these cool features!
import { inject, service } from "@loopback/core";
import { get, param, post, requestBody } from "@loopback/openapi-v3";
import { getModelSchemaRef, HttpErrors, Request, RestBindings } from "@loopback/rest";
import { RequestHandler, Response } from "express";
import { Item, Nft, ItemMetadata } from "../models";
import { NftService } from "../services";
import { FILE_UPLOAD_SERVICE } from "../services/keys";
import { AddressValidator, SupportedCurrency } from "./validators/address_validator";
import {ItemSchema } from "./validators/schemas/ItemSchema";
import Ajv from "ajv";
// import {inject} from '@loopback/core';


export class NftController {

  constructor(
    @inject(FILE_UPLOAD_SERVICE) private handler: RequestHandler,
    @service(NftService) private nftService: NftService
  ) { }



  /**
   * Endpoint to create New Collection
   * @param nftCollection 
   * @returns 
   */
  @post('/nft/collection')
  async createCollection(@requestBody() nftCollection: Nft): Promise<Nft> {
    if (nftCollection.id) throw new HttpErrors.BadRequest("New Collection cannot have id");
    if (!AddressValidator.validate(nftCollection.owner, SupportedCurrency.ETH))
      throw new HttpErrors.BadRequest("Owner Address not Valid");
    if (!AddressValidator.validate(nftCollection.contractAddress, SupportedCurrency.ETH))
      throw new HttpErrors.BadRequest("Contract Address not Valid");
    // TODO: Validate User address is actual owner of contract address from blockchain

    return this.nftService.createNft(nftCollection);

  }


  @get('/nft/collection/{id}')
  async getCollection(@param.path.string('id') id: string): Promise<Nft> {
    return this.nftService.getNft(id);
  }


  @get('/nft/user/{id}/collection')
  async getCollectionForUserId(@param.path.string('id') id: string): Promise<Nft[]> {
    return this.nftService.getUserNfts(id);
  }

  @get('/nft/collection')
  async getAllCollections(): Promise<Nft[]> {
    return this.nftService.getAllNfts();
  }

  /**
   *  Get All items of a Collection
   * @param id  
   * @returns 
   */
  @get('/nft/collection/{id}/items')
  async getCollectionItems(@param.path.string('id') id: string): Promise<Item[]> {
    return this.nftService.getCollectionItems(id);
  }
  /**
   * Endpoint to upload item and its metadata to ipfs and return metadata hash
   * 
   * @param request  
   * @param response 
   * @returns 
   */
  @post('/nft/collection/{id}/item/upload')
  async upload(
    @requestBody.file()
    request: Request,
    @param.path.string('id') id: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Item> {
    await this.nftService.getNft(id);
    let filesAndFields = await this.getFilesAndFields(request, response);    
    const ajv = new Ajv();
    const validate = ajv.compile(ItemSchema);
    if (!filesAndFields.fields.item) {
      throw new HttpErrors.BadRequest("Item Object is not present");
    }
  
    let object = filesAndFields.fields.item;  
    console.log(object);
    // Data sent from AWS Gateway/postman are converted to object instead of string before sending
    // Need to fix this   
    if(typeof object != 'object') 
    object = Object.assign({}, JSON.parse(filesAndFields.fields.item));
    // else
    object = Object.assign({}, object);
    object.metadata = Object.assign({}, object.metadata);
    console.log(object);
    let dataToValidate= object;
    if (!(validate(dataToValidate ))) {
      throw new HttpErrors.BadRequest(JSON.stringify(validate.errors));
    }
    let item:Item = object;
    let extract = { files: filesAndFields.files, item: item };    
    return this.nftService.uploadItem(extract);
  }

  /**
 * Get files and fields for the request
 * @param request - Http request
 */
  private getFilesAndFields(request: Request, response: Response): Promise<{ files: Express.Multer.File[], fields: any }> {
    return new Promise((resolve, reject) => {
      this.handler(request, response, (err: unknown) => {
        if (err) reject(err);
        else {
          //TODO:
          //reject(new HttpErrors.BadRequest("Item Format not correct"));  
          const uploadedFiles = request.files;
          const mapper = (f: Express.Multer.File) => (f);
          let files: Express.Multer.File[] = [];
          if (Array.isArray(uploadedFiles)) {
            files = uploadedFiles.map(mapper);
          } else {
            for (const filename in uploadedFiles) {
              files.push(...uploadedFiles[filename].map(mapper));
            }
          }
          resolve({ files: files, fields: request.body });
        }
      });
    });

  }

}


