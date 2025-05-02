import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './Angular/app.component';       // standalone
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  { path: '', component: DashboardComponent }
];

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(routes),  // sets up <router-outlet>
    AppComponent,                  // standalone root
    DashboardComponent             // standalone dashboard
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
