declare module 'express-fileupload' {
  import { Request } from 'express';
  
  export interface UploadedFile {
    name: string;
    data: Buffer;
    size: number;
    encoding: string;
    tempFilePath: string;
    truncated: boolean;
    mimetype: string;
    md5: string;
    mv: (path: string, callback?: (err?: any) => void) => Promise<void>;
  }
  
  interface FileUploadOptions {
    createParentPath?: boolean;
    uriDecodeFileNames?: boolean;
    safeFileNames?: boolean;
    preserveExtension?: boolean | number;
    abortOnLimit?: boolean;
    responseOnLimit?: string;
    limitHandler?: (req: Request, res: Response, next: NextFunction) => void;
    useTempFiles?: boolean;
    tempFileDir?: string;
    parseNested?: boolean;
    debug?: boolean;
    uploadTimeout?: number;
  }
  
  declare global {
    namespace Express {
      export interface Request {
        files?: {
          [fieldname: string]: UploadedFile | UploadedFile[];
        };
      }
    }
  }
  
  export default function fileUpload(options?: FileUploadOptions): (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void;
}