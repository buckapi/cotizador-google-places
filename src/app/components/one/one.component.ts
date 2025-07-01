import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { TravelDataService } from '../../services/travel-data.service';
import { MapboxService } from '../../services/mapbox.service';
import { VirtualRouterService } from '../../services/virtual-router.service';
import { CotizadorService } from '../../services/cotizador.service';
import { TramosService } from '../../services/tramos.service';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { GoogleMapsService } from '../../services/google-maps.service';

@Component({
  selector: 'app-one',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './one.component.html',
  styleUrls: ['./one.component.css']
})
export class OneComponent implements OnInit, AfterViewInit {
  @ViewChild('originInput', { static: false }) originInput!: ElementRef;
  @ViewChild('destinationInput', { static: false }) destinationInput!: ElementRef;
  private originPlace: google.maps.places.PlaceResult | null = null;
  private destinationPlace: google.maps.places.PlaceResult | null = null;
  private readySubject = new BehaviorSubject<boolean>(false);
  public ready$: Observable<boolean> = this.readySubject.asObservable();
  sillasBebe: number = 0;

  tipoServicio: 'aeropuerto' | 'punto' | 'hora' | null = null;
  vehiculoSeleccionado: string = 'sedan';
  isSubmitting: boolean = false;
  formSubmitted: boolean = false;

  origin = '';
  destination = '';
  passengerCount = 1;
  maletaCount = 0;
  distanciaKm: number = 0;
  fechaIda = '';
  horaIda = '';
  fechaVuelta = '';
  horaVuelta = '';
  numeroVuelo = '';
  tipoViaje: 'solo_ida' | 'ida_vuelta' = 'solo_ida';
  horasContratadas = 2;

  originCoords?: [number, number];
  destinationCoords?: [number, number];
  excesoLimite = false;

  readonly MAX_PERSONAS = 16;
  readonly MAX_MALETAS = 18;
  readonly coordenadasAeropuertoCuliacan: [number, number] = [-107.4702, 24.7645];
  readonly nombreAeropuerto = 'Aeropuerto de Culiacán';

  constructor(
    private googleMapsService: GoogleMapsService,
    private travelData: TravelDataService,
    private mapboxService: MapboxService,
    public virtualRouterService: VirtualRouterService,
    public cotizadorService: CotizadorService,
    public tramosService: TramosService
  ) {}
  increaseSillasBebe(): void {
    if (this.sillasBebe < 5) { // puedes ajustar el límite máximo
      this.sillasBebe++;
    }
  }
  
  decreaseSillasBebe(): void {
    if (this.sillasBebe > 0) {
      this.sillasBebe--;
    }
  }
  
  handleOriginChange(place: google.maps.places.PlaceResult) {
    const location = place.geometry?.location;
    if (location) {
      const lat = location.lat();
      const lng = location.lng();
      this.originCoords = [lng, lat]; // ¡Ojo! Mapbox usa [lng, lat]
    }
  }
  handleDestinationChange(place: google.maps.places.PlaceResult) {
    const location = place.geometry?.location;
    if (location) {
      const lat = location.lat();
      const lng = location.lng();
      this.destinationCoords = [lng, lat];
    }
  }
  private saveSubmissionState(): void {
    const state = {
      submitted: this.formSubmitted,
      submitting: this.isSubmitting,
      timestamp: new Date().getTime()
    };
    localStorage.setItem('formSubmissionState', JSON.stringify(state));
  }

  private clearSubmissionState(): void {
    localStorage.removeItem('formSubmissionState');
    this.formSubmitted = false;
    this.isSubmitting = false;
  }

  hasExistingFormData(): boolean {
    const savedState = localStorage.getItem('formSubmissionState');
    if (!savedState) return false;
    
    try {
      const state = JSON.parse(savedState);
      // Check if the state is recent (less than 1 hour old)
      const oneHourAgo = new Date().getTime() - (60 * 60 * 1000);
      return !!(state.timestamp && state.timestamp > oneHourAgo && state.submitted);
    } catch (e) {
      return false;
    }
  }

  resetForm(): void {
    // Clear the form and submission state
    this.clearSubmissionState();
    // Reset form fields
    this.origin = '';
    this.destination = '';
    this.passengerCount = 1;
    this.maletaCount = 0;
  }

  ngOnInit(): void {
    this.tramosService.cargarTramos();
    this.recuperarDatosGuardados();
    // Verificar si hay un estado de envío guardado
    const savedState = localStorage.getItem('formSubmissionState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Verificar si el estado es reciente (menos de 1 hora)
        const oneHourAgo = new Date().getTime() - (60 * 60 * 1000);
        if (state.timestamp && state.timestamp > oneHourAgo) {
          this.formSubmitted = state.submitted;
          this.isSubmitting = state.submitting;
        } else {
          this.clearSubmissionState();
        }
      } catch (e) {
        console.error('Error al cargar el estado del formulario:', e);
        this.clearSubmissionState();
      }
    }
  }

  ngAfterViewInit(): void {
    const checkElements = () => {
      if (this.originInput?.nativeElement && this.destinationInput?.nativeElement) {
        this.googleMapsService.setupAutocomplete(
          this.originInput.nativeElement,
          this.destinationInput.nativeElement
        );
      } else {
        setTimeout(checkElements, 300); // vuelve a intentar hasta que estén listos
      }
    };
    checkElements();
  }

  private initializeAutocomplete(): void {
    if (!this.originInput?.nativeElement || !this.destinationInput?.nativeElement) return;

    try {
      const originAutocomplete = new google.maps.places.Autocomplete(this.originInput.nativeElement, {
        types: ['establishment'],
        fields: ['formatted_address', 'geometry']
      });

      originAutocomplete.addListener('place_changed', () => {
        // ❌ No modificar si tipo aeropuerto y ya hay coordenadas
        if (this.tipoServicio === 'aeropuerto' || this.originCoords) return;

        const place = originAutocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          this.originPlace = place;
          this.originCoords = [lng, lat];
          this.origin = place.formatted_address || 'Origen seleccionado';
        }
      });

      const destinationAutocomplete = new google.maps.places.Autocomplete(this.destinationInput.nativeElement, {
        types: ['establishment'],
        fields: ['formatted_address', 'geometry']
      });

      destinationAutocomplete.addListener('place_changed', () => {
        // ❌ Evitar sobrescribir si ya hay coordenadas y tipo es aeropuerto
        if (this.tipoServicio === 'aeropuerto' && this.destinationCoords) return;

        const place = destinationAutocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          this.destinationPlace = place;
          this.destinationCoords = [lng, lat];
          this.destination = place.formatted_address || 'Destino seleccionado';
        }
      });
    } catch (error) {
      console.error('Error al inicializar Google Autocomplete:', error);
    }
  }

  seleccionarTipoServicio(tipo: 'aeropuerto' | 'punto' | 'hora') {
    this.tipoServicio = tipo;
    this.destination = '';
    this.destinationCoords = undefined;

    if (tipo === 'aeropuerto') {
      this.origin = this.nombreAeropuerto;
      this.originCoords = [-99.0721, 19.4361]; // Aeropuerto CDMX (Benito Juárez)
      this.originPlace = {
        formatted_address: this.nombreAeropuerto,
        geometry: {
          location: {
            lat: () => 19.4361,
            lng: () => -99.0721
          }
        }
      } as google.maps.places.PlaceResult;
    } else {
      this.origin = '';
      this.originCoords = undefined;
    }
  }

  vehiculoDisponible(tipo: string): boolean {
    return this.vehiculoSeleccionado === tipo;
  }

  increaseCount(): void {
    if (this.passengerCount < this.MAX_PERSONAS) {
      this.passengerCount++;
      this.actualizarVehiculoRecomendado();
    }
  }

  decreaseCount(): void {
    if (this.passengerCount > 1) {
      this.passengerCount--;
      this.actualizarVehiculoRecomendado();
    }
  }

  increaseMaletaCount(): void {
    if (this.maletaCount < this.MAX_MALETAS) {
      this.maletaCount++;
      this.actualizarVehiculoRecomendado();
    }
  }

  decreaseMaletaCount(): void {
    if (this.maletaCount > 0) {
      this.maletaCount--;
      this.actualizarVehiculoRecomendado();
    }
  }

  private actualizarVehiculoRecomendado(): void {
    const personas = this.passengerCount;
    const maletas = this.maletaCount;

    const capacidades = [
      { tipo: 'sedan', maxPersonas: 3, maxMaletas: 3 },
      { tipo: 'minivan', maxPersonas: 6, maxMaletas: 6 },
      { tipo: 'suv', maxPersonas: 7, maxMaletas: 7 },
      { tipo: 'minibus', maxPersonas: 12, maxMaletas: 12 },
      { tipo: 'Van 16 asientos', maxPersonas: 16, maxMaletas: 16 }
    ];

    for (let v of capacidades) {
      if (personas <= v.maxPersonas && maletas <= v.maxMaletas) {
        this.vehiculoSeleccionado = v.tipo;
        return;
      }
    }
    this.vehiculoSeleccionado = 'Van 16 asientos';
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    if (this.isSubmitting || this.formSubmitted) return;

    this.isSubmitting = true;
    this.saveSubmissionState();

    try {
      await this.guardarDatos();

      this.googleMapsService.calcularRuta(async (distanceKm, originText, destinationText) => {
        try {
          this.distanciaKm = distanceKm;
          this.origin = originText;
          this.destination = destinationText;

          const travelData = {
            tipoServicio: this.tipoServicio,
            vehiculoSeleccionado: this.vehiculoSeleccionado,
            origin: this.origin,
            destination: this.destination,
            passengerCount: this.passengerCount,
            maletaCount: this.maletaCount,
            fechaIda: this.fechaIda,
            sillasBebe: this.sillasBebe,
            horaIda: this.horaIda,
            fechaVuelta: this.fechaVuelta,
            horaVuelta: this.horaVuelta,
            numeroVuelo: this.numeroVuelo,
            tipoViaje: this.tipoViaje,
            horasContratadas: this.horasContratadas,
            distanciaKm: distanceKm,
            timestamp: new Date().getTime()
          };

          this.travelData.setTravelData(this.origin, this.destination);
          this.cotizadorService.setDistanciaKm(distanceKm);
          localStorage.setItem('datosCotizador', JSON.stringify(travelData));
          this.guardarDatos();

          // Marcar el formulario como enviado
          this.formSubmitted = true;
          this.isSubmitting = false;
          this.saveSubmissionState();

          // Navegar a la siguiente ruta
          this.virtualRouterService.setActiveRoute('two');

        } catch (error) {
          console.error('Error al procesar la solicitud:', error);
          this.isSubmitting = false;
          await Swal.fire({
            title: 'Error',
            text: 'Ocurrió un error al procesar tu solicitud.',
            icon: 'error',
            confirmButtonText: 'Entendido',
            buttonsStyling: false,
            customClass: {
              confirmButton: 'confirmar'
            }
          });
        }
      });
    } catch (error) {
      console.error('Error al calcular la ruta:', error);
      this.isSubmitting = false;
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo calcular la ruta. Por favor, verifica las direcciones e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        buttonsStyling: false,
        customClass: {
          confirmButton: 'confirmar'
        }
      });
    }
  }

  async guardarDatos(): Promise<void> {
    const formData = {
      tipoServicio: this.tipoServicio,
      vehiculoSeleccionado: this.vehiculoSeleccionado,
      origin: this.origin,
      destination: this.destination,
      passengerCount: this.passengerCount,
      maletaCount: this.maletaCount,
      sillasBebe: this.sillasBebe, // ← aquí
      fechaIda: this.fechaIda,
      horaIda: this.horaIda,
      fechaVuelta: this.fechaVuelta,
      horaVuelta: this.horaVuelta,
      numeroVuelo: this.numeroVuelo,
      tipoViaje: this.tipoViaje,
      horasContratadas: this.horasContratadas
    };
    
    localStorage.setItem('cotizacionData', JSON.stringify(formData));
    this.saveSubmissionState();
  }

  recuperarDatosGuardados(): void {
    const savedData = localStorage.getItem('cotizacionData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        Object.assign(this, data);
      } catch (e) {
        console.error('Error al recuperar datos guardados:', e);
      }
    }
  }
}
