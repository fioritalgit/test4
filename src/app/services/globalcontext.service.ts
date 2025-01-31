import { Injectable } from '@angular/core';

export type tFilterFunction = (sdata: any, searchTerm: string) => boolean;
export type tFilterFields = string[]
type tFilterFunctionObject = { rowType: string, filterId: string, filterFunction: tFilterFunction }
type tbFilterFunction = tFilterFunctionObject[];

export interface IsearchReference {
  /** True if the column is hidden */
  rowType?: string | '';
  filterId: string | '';
  searchTerm: string | '';
}

export type ISearchReferenceArray = Array<IsearchReference>;


@Injectable({
  providedIn: 'root'
})

export class GlobalcontextService {

  public searchTargets: ISearchReferenceArray = [];
  public filterFunctions: tbFilterFunction = [] //<-- filter functions

  constructor() {

  }

  setFilterFunction(rowType: string ,filterFunction: tFilterFunction , filterId?: string) {
    if (filterId)
      var sFilter: tFilterFunctionObject = { rowType: rowType, filterFunction: filterFunction ,filterId: filterId}
    else
      var sFilter: tFilterFunctionObject = { rowType: rowType, filterFunction: filterFunction ,filterId: ''}

    this.filterFunctions.push(sFilter)
  }



  public addSearchReference(newRef: IsearchReference) {

    var fnd: IsearchReference | undefined = this.searchTargets.find((ssearch) => {
      return (ssearch.rowType === newRef.rowType && ssearch.filterId === newRef.filterId);
    })

    if (fnd !== undefined) {
      if (newRef.searchTerm !== '') {
        fnd.searchTerm = newRef.searchTerm
      } else {
        const index = this.searchTargets.indexOf(fnd);
      }
    } else {
      //--> new filter
      if (newRef.searchTerm !== '') {
        this.searchTargets.push(newRef);
      }
    }

  }

  public setFilterProperties(rowData: any) {

    var searchBuffer: any = {}

    //--> filter all the grid data
    rowData.forEach((sdata: any) => {

      //--> reset filtering by default
      sdata.__clientFiltering = true

      //--> loop over all active filters for row type (using buffer first)
      var searchBLock: any;
      if (searchBuffer[sdata.rowType]){
        searchBLock = searchBuffer[sdata.rowType]
      }else{
        searchBuffer[sdata.rowType] = this.searchTargets.filter((ssearch)=>{
          return (ssearch.rowType === sdata.rowType)
        })
        searchBLock = searchBuffer[sdata.rowType]
      }

      //--> now act over active filters
      searchBLock.forEach((ssearch: any)=>{
          //--> must identify if we have a filter function 
          var activeFilterFunction = this.filterFunctions.find((sfunction: any)=>{
            return ((sfunction.rowType === '*' || sfunction.rowType === ssearch.rowType) && sfunction.filterId === ssearch.filterId)
          })

          if (activeFilterFunction){
            activeFilterFunction.filterFunction(sdata,ssearch.searchTerm)
          }
      })

    })
  }

  public getSearchContext(): ISearchReferenceArray {
    return this.searchTargets
  }

}
