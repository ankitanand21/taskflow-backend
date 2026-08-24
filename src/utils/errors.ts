export class AppError extends Error { constructor(public status:number, public code:string, message:string, public details:unknown={}){super(message)} }
export const notFound=(msg:string,code:string)=>new AppError(404,code,msg);
