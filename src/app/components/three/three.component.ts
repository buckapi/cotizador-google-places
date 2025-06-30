import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { GoogleMapsService } from '../../services/google-maps.service';
import { TravelDataService } from '../../services/travel-data.service';
import { CotizadorService } from '../../services/cotizador.service';
import { TramosService } from '../../services/tramos.service';
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

  private tramosService = inject(TramosService);

  constructor(
    private googleMapsService: GoogleMapsService,
    private travelDataService: TravelDataService,
    private cotizadorService: CotizadorService,
    private cdr: ChangeDetectorRef
  ) {}

  // Mapeo de imágenes de vehículos
  imagenesVehiculos = [
    { tipo: 'sedan', subtipo: 'estandar', img: 'assets/img/vehiculos/sedan_standar.png' },
    { tipo: 'sedan', subtipo: 'espacioso', img: 'assets/img/vehiculos/sedan_espacioso.png' },
    { tipo: 'sedan', subtipo: 'premium', img: 'assets/img/vehiculos/sedan_premium.png' },
    { tipo: 'minivan', subtipo: 'estandar', img: 'assets/img/vehiculos/minivan_standar.png' },
    { tipo: 'minivan', subtipo: 'premium', img: 'assets/img/vehiculos/minivan_premium.png' },
    { tipo: 'suv', subtipo: 'premium', img: 'assets/img/vehiculos/suv_premium.png' },
    { tipo: 'minibus', subtipo: 'Van 12 asientos', img: 'assets/img/vehiculos/bus12_standar.png' },
    { tipo: 'Van 16 asientos', subtipo: 'Van 16 asientos', img: 'assets/img/vehiculos/bus16_standar.png' }
  ];

  // Control para mostrar/ocultar detalles de precios
  showPriceDetails = false;

  viajeData: any = {};
  desgloseTarifa: any = {
    precioBase: 0,
    kmExtras: 0,
    precioPorKm: 0,
    subtotal: 0,
    iva: 0,
    total: 0
  };

  private obtenerClaveVehiculo(tipo: string, subtipo: string): string {
    const normalizar = (txt: string) => txt.toLowerCase().replace(/\s+/g, '_');
    if (tipo === 'minibus' && subtipo === 'Van 12 asientos') return 'minibus_12';
    if (tipo === 'Van 16 asientos') return 'minibus_19';
    return `${normalizar(tipo)}_${normalizar(subtipo)}`;
  }

  private calcularDesgloseTarifa() {
    if (!this.viajeData.vehiculoSeleccionado || !this.viajeData.distanciaKm) return;

    const distancia = parseFloat(this.viajeData.distanciaKm);
    const vehiculo = this.obtenerClaveVehiculo(
      this.viajeData.vehiculoSeleccionado,
      this.viajeData.vehiculoSubtipoSeleccionado || 'estandar'
    );
    
    // Obtener tramo fijo (0-10km)
    const tramos = this.tramosService.getTramos();
    
    // Inicializar valores
    this.desgloseTarifa = {
      precioBase: 0,
      kmExtras: 0,
      precioPorKm: 0,
      subtotal: 0,
      iva: 0,
      total: 0
    };
    const tramoFijo = tramos.find((t: any) => t.tipo === 'fijo');
    if (tramoFijo) {
      const servicio = this.viajeData.tipoServicio === 'aeropuerto' ? 'aeropuerto_hotel' : 'punto_a_punto';
      const tarifasServicio = tramoFijo.tarifas as Record<string, Record<string, number>>;
      this.desgloseTarifa.precioBase = tarifasServicio?.[servicio]?.[vehiculo] || 0;
    }

    // Calcular KM extras si aplica
    if (distancia > 10) {
      const tramoVariable = tramos
        .filter((t: any) => t.tipo === 'por_intervalo')
        .find((t: any) => distancia > (t.kmDesde || 0) && distancia <= (t.kmHasta || Infinity));

      if (tramoVariable) {
        const tarifasKm = tramoVariable.tarifas as Record<string, number>;
        const precioPorUnidad = tarifasKm[vehiculo] || 0;
        const unidad = tramoVariable.unidadCadaKm || 1;
        this.desgloseTarifa.kmExtras = Math.max(0, distancia - 10);
        this.desgloseTarifa.precioPorKm = unidad > 0 ? precioPorUnidad / unidad : 0;
      }
    } else {
      this.desgloseTarifa.kmExtras = 0;
      this.desgloseTarifa.precioPorKm = 0;
    }

    // Calcular totales
    this.desgloseTarifa.subtotal = this.desgloseTarifa.precioBase + 
                                 (this.desgloseTarifa.kmExtras * this.desgloseTarifa.precioPorKm);
    this.desgloseTarifa.iva = this.desgloseTarifa.subtotal * 0.16; // 16% de IVA
    this.desgloseTarifa.total = this.desgloseTarifa.subtotal + this.desgloseTarifa.iva;
  }

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
      this.distanciaKm = parseFloat(this.viajeData.distanciaKm) || 0;
      this.tarifaTotal = parseFloat(this.viajeData.tarifaTotal) || 0;
      
      // Asegurarse de que el servicio de tramos esté cargado
      this.tramosService.cargarTramos().then(() => {
        // Calcular el desglose de la tarifa después de cargar los tramos
        this.calcularDesgloseTarifa();
        this.cdr.detectChanges(); // Forzar actualización de la vista
      });
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

  // Obtener la ruta de la imagen del vehículo seleccionado
  getImagenVehiculo(tipo: string, subtipo: string): string {
    if (!tipo || !subtipo) return 'assets/img/vehiculos/default.png';
    
    const vehiculo = this.imagenesVehiculos.find(v => 
      v.tipo.toLowerCase() === tipo.toLowerCase() && 
      v.subtipo.toLowerCase() === subtipo.toLowerCase()
    );
    
    return vehiculo ? vehiculo.img : 'assets/img/vehiculos/default.png';
  }

  // Alternar visibilidad de los detalles de precios
  togglePriceDetails(): void {
    this.showPriceDetails = !this.showPriceDetails;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
