import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtualRouterService } from '../../../services/virtual-router.service';
import { TravelDataService } from '../../../services/travel-data.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  constructor(
    public virtualRouterService: VirtualRouterService,
    private travelDataService: TravelDataService
  ) { }

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
      localStorage.clear();
      this.virtualRouterService.setActiveRoute('one');
  
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
