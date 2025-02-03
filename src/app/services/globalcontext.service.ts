import { Injectable } from '@angular/core';
import { GridApi, IRowNode } from 'ag-grid-enterprise';

export type tFilterFunction = (sdata: any, searchTerm: string) => boolean;
export type tFilterFields = string[]
type tFilterFunctionObject = { rowType: string, filterId: string, filterFunction: tFilterFunction }
type tbFilterFunction = tFilterFunctionObject[];

export type tModifyFilterResult = {activeFilter: boolean, hasVisibleItems: boolean}

export interface IsearchReference {
  rowType?: string | '';
  filterId: string | '';
  searchTerm: string | '';
  groupComponentRef: any
}

export type ISearchReferenceArray = Array<IsearchReference>;


@Injectable({
  providedIn: 'root'
})

export class GlobalcontextService {

  public searchTargets: ISearchReferenceArray = [];
  public filterFunctions: tbFilterFunction = [] //<-- filter functions
  public filterStatuses: any = {}
  public api: any 

  constructor() {

  }

  public clearAllRowTypeFilters(){

    this.searchTargets.forEach((ssearch)=>{
      ssearch.groupComponentRef.searchInputRef.elementRef.nativeElement.value = '';
      ssearch.groupComponentRef.filterRes.activeFilter = false
      ssearch.groupComponentRef.filterRes.hasVisibleItems = false
    })
    this.searchTargets = []
    this.filterStatuses = {}

    this.api.getGridOption('rowData').forEach((sdata:any)=>{
      sdata.__clientFiltering = undefined
    })

    this.api.onFilterChanged() //<--- trigger grid refresh!
  }

  public setAPI(api: GridApi){
    this.api = api
  }

  setFilterFunction(rowType: string, filterFunction: tFilterFunction, filterId?: string) {
    if (filterId)
      var sFilter: tFilterFunctionObject = { rowType: rowType, filterFunction: filterFunction, filterId: filterId }
    else
      var sFilter: tFilterFunctionObject = { rowType: rowType, filterFunction: filterFunction, filterId: '' }

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
        this.searchTargets.splice(index,1)
      }
    } else {
      //--> new filter
      if (newRef.searchTerm !== '') {
        this.searchTargets.push(newRef);
      }
    }

  }

  public testNode(node: IRowNode<any>){
    if(node.data.__clientFiltering !== undefined){

      //--> must ignore filter if all sublines are filtered = inefficiend filter
      if (this.filterStatuses[node.data.rowType].hasVisibleItems === false){
        return true;
      }else{
        return node.data.__clientFiltering;
      }

    }else{
      return true;
    }
  }

  public setFilterProperties(rowData: any, rowTypeCaller: string):tModifyFilterResult {

    var searchBuffer: any = {}
    var res: tModifyFilterResult = {activeFilter: false,hasVisibleItems:false}

    //--> filter all the grid data
    rowData.forEach((sdata: any) => {

      sdata.__clientFiltering = undefined

      //--> loop over all active filters for row type (using buffer first)
      var searchBLock: any;
      if (searchBuffer[sdata.rowType]) {
        searchBLock = searchBuffer[sdata.rowType]
      } else {
        searchBuffer[sdata.rowType] = this.searchTargets.filter((ssearch) => {
          return (ssearch.rowType === sdata.rowType)
        })
        searchBLock = searchBuffer[sdata.rowType]
      }

      //--> now act over active filters
      searchBLock.forEach((ssearch: any) => {
        //--> must identify if we have a filter function 
        var activeFilterFunction = this.filterFunctions.find((sfunction: any) => {
          return ((sfunction.rowType === '*' || sfunction.rowType === ssearch.rowType) && sfunction.filterId === ssearch.filterId)
        })

        if (activeFilterFunction) {    
          
          sdata.__clientFiltering = activeFilterFunction.filterFunction(sdata, ssearch.searchTerm)

          if (rowTypeCaller === '*' || ssearch.rowType === rowTypeCaller){
            res.activeFilter = true
            if (sdata.__clientFiltering === true){
              res.hasVisibleItems = true
            }

            //--> map filter status for rowType for global filtering
            if(rowTypeCaller === '*'){
              this.filterStatuses[ssearch.rowType] = res
            }else{
              this.filterStatuses[rowTypeCaller] = res
            }
            
          }
          
        }
      })

    })

    //--> pass result to display filter icons and more
    return res

  }

  public getSearchContext(): ISearchReferenceArray {
    return this.searchTargets
  }

}
