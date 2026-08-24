import {describe,it,expect} from 'vitest';
function pagination(page:number,limit:number){return {skip:(page-1)*limit,take:limit}};
describe('pagination helper',()=>{it('calculates offset',()=>expect(pagination(3,20)).toEqual({skip:40,take:20}))});
