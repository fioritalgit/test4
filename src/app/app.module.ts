import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AgGridAngular } from 'ag-grid-angular'; // Angular Data Grid Component
import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";

ModuleRegistry.registerModules([AllEnterpriseModule]);

LicenseManager.setLicenseKey('Using_this_{AG_Grid}_Enterprise_key_{AG-067750}_in_excess_of_the_licence_granted_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_changing_this_key_please_contact_info@ag-grid.com___{Fiorital_spa}_is_granted_a_{Single_Application}_Developer_License_for_the_application_{fiorital_easypo}_only_for_{1}_Front-End_JavaScript_developer___All_Front-End_JavaScript_developers_working_on_{fiorital_easypo}_need_to_be_licensed___{fiorital_easypo}_has_not_been_granted_a_Deployment_License_Add-on___This_key_works_with_{AG_Grid}_Enterprise_versions_released_before_{27_October_2025}____[v3]_[01]_MTc2MTUyMzIwMDAwMA==33ee89f9bb5b419b735e7b13a44eb9d8');

import { HotkeyModule } from 'angular2-hotkeys';

//import { Ui5MainModule } from '@ui5/webcomponents-ngx/main';
import { ButtonComponent } from '@ui5/webcomponents-ngx/main/button';
import { ToolbarComponent } from '@ui5/webcomponents-ngx/main/toolbar';
import { ToolbarButtonComponent } from '@ui5/webcomponents-ngx/main/toolbar-button';
import { LabelComponent } from '@ui5/webcomponents-ngx/main/label';
import { InputComponent } from '@ui5/webcomponents-ngx/main/input';
import { DialogComponent } from '@ui5/webcomponents-ngx/main/dialog';
import { TabComponent } from '@ui5/webcomponents-ngx/main/tab';
import { TabContainerComponent } from '@ui5/webcomponents-ngx/main/tab-container';
import { TabSeparatorComponent } from '@ui5/webcomponents-ngx/main/tab-separator';
import { IconComponent } from '@ui5/webcomponents-ngx/main/icon';
import { BarComponent } from '@ui5/webcomponents-ngx/main/bar';

import '@ui5/webcomponents-icons/dist/palette.js';
import "@ui5/webcomponents-icons/dist/activities.js";
import "@ui5/webcomponents-icons/dist/menu.js";
import "@ui5/webcomponents-icons/dist/clear-filter.js";
import "@ui5/webcomponents-icons/dist/question-mark.js";
import "@ui5/webcomponents-icons/dist/navigation-right-arrow.js";

import { CustomGroupRowCompComponent } from './custom-group-row-comp/custom-group-row-comp.component';
import { ValueCellRendererComponent } from './value-cell-renderer/value-cell-renderer.component';


@NgModule({
  declarations: [
    AppComponent,
    CustomGroupRowCompComponent,
    ValueCellRendererComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AgGridAngular,

    HotkeyModule.forRoot(),

    //---> Ui% ngx imports
    ButtonComponent,
    ToolbarComponent,
    ToolbarButtonComponent,
    LabelComponent,
    InputComponent,
    DialogComponent,
    TabComponent,
    TabContainerComponent,
    TabSeparatorComponent,
    IconComponent,
    BarComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
