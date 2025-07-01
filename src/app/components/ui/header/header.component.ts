import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { TravelDataService } from '../../../services/travel-data.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentRoute: string = '';
  private routerSubscription: Subscription | undefined;
  constructor(
    private travelDataService: TravelDataService,
    public router: Router
  ) { }

  ngOnInit() {
    this.currentRoute = this.router.url;
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = event.url;
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  hasSubmittedForm(): boolean {
    const savedState = localStorage.getItem('formSubmissionState');
    if (!savedState) return false;
    
    try {
      const state = JSON.parse(savedState);
      const oneHourAgo = new Date().getTime() - (60 * 60 * 1000);
      return !!(state.timestamp && state.timestamp > oneHourAgo && state.submitted);
    } catch (e) {
      return false;
    }
  }

  async resetApp(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se reiniciará todo el formulario y se perderán todos los datos ingresados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, reiniciar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        confirmButton: 'confirmar',
        cancelButton: 'cancelar'
      }
    });
  
    if (result.isConfirmed) {
      this.travelDataService.resetAllData();
      this.router.navigate(['/one']);
      localStorage.clear();
      this.router.navigate(['/one']);
  
      await Swal.fire({
        title: '¡Reiniciado!',
        text: 'El formulario ha sido reiniciado.',
        icon: 'success',
        confirmButtonText: 'OK',
        buttonsStyling: false,
        customClass: {
          confirmButton: 'confirmar'
        }
      });
  
      window.location.reload();
    }
  }
  
}
