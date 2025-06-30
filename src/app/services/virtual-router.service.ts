import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VirtualRouterService {
activeroute: string = 'one';
  constructor() { }

  setActiveRoute(route: string) {
    this.activeroute = route;     
  }
}
