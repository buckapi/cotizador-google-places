import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';
import { GoogleMapsService } from '../../services/google-maps.service';
import { TravelDataService } from '../../services/travel-data.service';
import { CotizadorService } from '../../services/cotizador.service';
import { combineLatest, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-three',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './three.component.html',
  styleUrls: ['./three.component.css']
})
export class ThreeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapRef') mapRef!: ElementRef;

  origenTexto: string = '';
  destinoTexto: string = '';
  distanciaKm: number = 0;
  tarifaTotal: number = 0;

  private subs = new Subscription();

  constructor(
    private googleMapsService: GoogleMapsService,
    private travelDataService: TravelDataService,
    private cotizadorService: CotizadorService,
    private cdr: ChangeDetectorRef
  ) {}

  viajeData: any = {};

  // Método para actualizar las notas en el localStorage
  actualizarNotas(notas: string): void {
    this.viajeData.notas = notas;
    this.guardarDatos();
  }

  // Método para guardar los datos actualizados
  private guardarDatos(): void {
    localStorage.setItem('datosCotizador', JSON.stringify(this.viajeData));
  }

  ngAfterViewInit(): void {
    // Cargar datos del localStorage
    const datosGuardados = localStorage.getItem('datosCotizador');
    if (datosGuardados) {
      this.viajeData = JSON.parse(datosGuardados);
      this.origenTexto = this.viajeData.origin || '';
      this.destinoTexto = this.viajeData.destination || '';
      this.distanciaKm = this.viajeData.distanciaKm || 0;
      this.tarifaTotal = this.viajeData.tarifaTotal || 0;
    }

    // Inicializar el mapa
    this.googleMapsService.initMap(this.mapRef.nativeElement);

    // Si hay coordenadas, dibujar la ruta
    if (this.viajeData.originCoords && this.viajeData.destinationCoords) {
      this.googleMapsService.calcularRuta(
        (distancia: number, origen: string, destino: string) => {
          this.distanciaKm = distancia;
          this.origenTexto = origen || this.origenTexto;
          this.destinoTexto = destino || this.destinoTexto;
          this.cdr.detectChanges();
        }
      );
    }

    // Suscribirse a cambios en la tarifa
    this.cotizadorService.tarifaTotal$.subscribe(valor => {
      this.tarifaTotal = valor;
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
