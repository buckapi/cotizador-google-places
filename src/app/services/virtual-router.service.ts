import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VirtualRouterService {
  private activeRouteSubject = new BehaviorSubject<string>('one');
  activeRoute$ = this.activeRouteSubject.asObservable();
  
  get activeRoute(): string {
    return this.activeRouteSubject.value;
  }

  constructor() { 
    // Cargar la ruta guardada si existe
    const savedRoute = localStorage.getItem('activeRoute');
    if (savedRoute) {
      this.activeRouteSubject.next(savedRoute);
    }
  }

  setActiveRoute(route: string) {
    this.activeRouteSubject.next(route);
    localStorage.setItem('activeRoute', route);
  }
}
