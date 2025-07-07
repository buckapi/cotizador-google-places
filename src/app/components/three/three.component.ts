import { Component, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { GoogleMapsService } from '../../services/google-maps.service';
import { TravelDataService } from '../../services/travel-data.service';
import { CotizadorService } from '../../services/cotizador.service';
import { TramosService } from '../../services/tramos.service';
import { combineLatest, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { VirtualRouterService } from '../../services/virtual-router.service';
import { EmailService } from '../../services/email.service';

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

  stylesEnabled = true;

  constructor(
    public virtualRouterService: VirtualRouterService,
    private googleMapsService: GoogleMapsService,
    private travelDataService: TravelDataService,
    private cotizadorService: CotizadorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private emailService: EmailService
  ) {}

  toggleMapStyles(): void {
    this.stylesEnabled = !this.stylesEnabled;
    this.googleMapsService.toggleMapStyles();
  }

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

  volver() {
    this.virtualRouterService.setActiveRoute('two');
    // this.router.navigate(['/two']);
  }

  finalizar() {
    // Lógica para finalizar la cotización
    this.virtualRouterService.setActiveRoute('one');
    // this.router.navigate(['/one']);
  }

  // Obtener la tarifa por hora según el vehículo seleccionado
  getTarifaHora() {
    const tarifasHora = [
      { tipo: 'sedan', subtipo: 'estandar', pasajeros: 3, base: 1500, adicional: 750, tiempoMax: '24 h' },
      { tipo: 'sedan', subtipo: 'espacioso', pasajeros: 3, base: 2056, adicional: 1028, tiempoMax: '24 h' },
      { tipo: 'sedan', subtipo: 'premium', pasajeros: 3, base: 3480, adicional: 1740, tiempoMax: '24 h' },
      { tipo: 'minivan', subtipo: 'estandar', pasajeros: 6, base: 2898, adicional: 1449, tiempoMax: '24 h' },
      { tipo: 'minivan', subtipo: 'premium', pasajeros: 6, base: 5761, adicional: 2880, tiempoMax: '24 h' },
      { tipo: 'suv', subtipo: 'premium', pasajeros: 7, base: 6356, adicional: 3178, tiempoMax: '24 h' },
      { tipo: 'minibus', subtipo: 'Van 12 asientos', pasajeros: 12, base: 7950, adicional: 3975, tiempoMax: '24 h' },
      { tipo: 'Van 16 asientos', subtipo: 'Van 16 asientos', pasajeros: 16, base: 8960, adicional: 4480, tiempoMax: '24 h' }
    ];

    return tarifasHora.find(t => 
      t.tipo === this.viajeData.vehiculoSeleccionado && 
      t.subtipo === this.viajeData.vehiculoSubtipoSeleccionado
    );
  }

  // Método para calcular el total del servicio por hora
  calcularTotalHora(): number {
    if (!this.viajeData.hours) return 0;
    
    const horas = parseFloat(this.viajeData.hours);
    const tarifa = this.getTarifaHora();
    
    if (!tarifa) return 0;

    // Calcular tarifa según las horas
    const horasExtras = Math.max(0, horas - 2); // Las primeras 2 horas ya están incluidas
    const subtotal = tarifa.base + (horasExtras * tarifa.adicional);
    
    // Aplicar IVA del 16%
    return subtotal * 1.16;
  }

  // Método para guardar los datos actualizados
  private guardarDatos(): void {
    localStorage.setItem('datosCotizador', JSON.stringify(this.viajeData));
  }

  ngAfterViewInit(): void {
    // Usar setTimeout para evitar el error de cambio de expresión
    setTimeout(() => {
      // Cargar datos del localStorage
      const datosGuardados = localStorage.getItem('datosCotizador');
      if (datosGuardados) {
        try {
          this.viajeData = JSON.parse(datosGuardados);
          this.origenTexto = this.viajeData.origin || '';
          this.destinoTexto = this.viajeData.destination || '';
          this.distanciaKm = parseFloat(this.viajeData.distanciaKm) || 0;
          this.tarifaTotal = parseFloat(this.viajeData.tarifaTotal) || 0;
          
          // Inicializar el mapa
          this.googleMapsService.initMap(this.mapRef.nativeElement);
          
          // Si es servicio por hora, mostrar marcador en el punto de recogida
          if (this.viajeData.tipoServicio === 'hora' && this.viajeData.originCoords) {
            const [lng, lat] = this.viajeData.originCoords;
            this.googleMapsService.addPickupMarker({ lat, lng }, 'Punto de recogida');
            this.googleMapsService.centerMap({ lat, lng });
          } 
          // Si hay coordenadas de origen y destino, dibujar la ruta
          else if (this.viajeData.originCoords && this.viajeData.destinationCoords) {
            // Llamar a calcularRuta con las coordenadas guardadas
            this.googleMapsService.calcularRuta(
              (distancia: number, origen: string, destino: string) => {
                this.distanciaKm = distancia;
                this.origenTexto = origen || this.origenTexto;
                this.destinoTexto = destino || this.destinoTexto;
                this.cdr.detectChanges();
              },
              this.viajeData.originCoords,
              this.viajeData.destinationCoords,
              this.viajeData.origin,
              this.viajeData.destination
            );
          }
          
          // Asegurarse de que el servicio de tramos esté cargado
          this.tramosService.cargarTramos().then(() => {
            // Calcular el desglose de la tarifa después de cargar los tramos
            this.calcularDesgloseTarifa();
            this.cdr.detectChanges();
          });
          
        } catch (error) {
          console.error('Error al cargar los datos guardados:', error);
        }
      }
    });

    // Inicializar el mapa
    this.googleMapsService.initMap(this.mapRef.nativeElement);

    // Si es servicio por hora, mostrar marcador en el punto de recogida
    if (this.viajeData.tipoServicio === 'hora' && this.viajeData.originCoords) {
      const [lng, lat] = this.viajeData.originCoords;
      this.googleMapsService.addPickupMarker({ lat, lng }, 'Punto de recogida');
      this.googleMapsService.centerMap({ lat, lng });
      this.origenTexto = this.viajeData.origin || 'Ubicación seleccionada';
      this.destinoTexto = 'Servicio por hora';
      this.cdr.detectChanges();
    } 
    // Si hay coordenadas de origen y destino, dibujar la ruta
    else if (this.viajeData.originCoords && this.viajeData.destinationCoords) {
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
    if (!tipo) return 'assets/img/vehiculos/default.png';
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

  async procesarSolicitud(): Promise<void> {
    console.log('Iniciando proceso de pago...', this.viajeData);
  
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: 'Información de pago',
      html: `
        <div class="text-left">
          <p class="mb-3">Estás a punto de realizar el pago de $${this.viajeData.tarifaTotal?.toFixed(2) || '0.00'} MXN a través de Stripe.</p>
          <div class="mb-3">
            <label for="swal-input1" class="block text-sm font-medium mb-1">Nombre completo</label>
            <input id="swal-input1" class="swal2-input" placeholder="Nombre completo" required>
          </div>
          <div class="mb-3">
            <label for="swal-input2" class="block text-sm font-medium mb-1">Correo electrónico</label>
            <input id="swal-input2" class="swal2-input" type="email" placeholder="correo@ejemplo.com" required>
          </div>
          <div class="text-xs text-gray-500 mt-4">
            <p class="font-semibold mb-1">Proceso de pago seguro:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li>Serás redirigido a la plataforma de pago seguro de Stripe</li>
              <li>Puedes pagar con tarjeta de crédito o débito</li>
              <li>No almacenamos la información de tu tarjeta</li>
            </ul>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Pagar con Stripe',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'confirmar',
        cancelButton: 'cancelar',
        popup: 'text-left'
      },
      preConfirm: () => {
        const nameInput = document.getElementById('swal-input1') as HTMLInputElement;
        const emailInput = document.getElementById('swal-input2') as HTMLInputElement;
  
        if (!nameInput.value || !emailInput.value) {
          Swal.showValidationMessage('Por favor completa todos los campos');
          return false;
        }
  
        if (!/^\S+@\S+\.\S+$/.test(emailInput.value)) {
          Swal.showValidationMessage('Por favor ingresa un correo electrónico válido');
          return false;
        }
  
        return {
          name: nameInput.value.trim(),
          email: emailInput.value.trim()
        };
      }
    });
  
    if (!isConfirmed || !formValues) return;
  
    try {
      // 👉 Aquí iría tu proceso de pago con Stripe
  
      // 🔑 Determina los templateId según el tipo de servicio
      const clienteTemplateId = this.getClienteTemplateId(this.viajeData.tipoServicio);
      const adminTemplateId = this.getAdminTemplateId();
  
      // ✉️ Construye los parámetros comunes para el email
      const emailParams = {
        nombre: formValues.name,
        correo: formValues.email,
        origen: this.viajeData.origin,
        destino: this.viajeData.destination,
        tarifa: `$${this.viajeData.tarifaTotal?.toFixed(2) || '0.00'} MXN`,
        fecha: new Date().toLocaleString(),
        tipoServicio: this.viajeData.tipoServicio
      };
  
      // 👉 Enviar correo al cliente
      await this.emailService.enviarCorreo(this.viajeData.tipoServicio, {
        toEmail: formValues.email,
        toName: formValues.name,
        templateId: clienteTemplateId,
        params: emailParams
      }).toPromise();
      
      await this.emailService.enviarCorreoAdmin({
        toEmail: 'viaztransfer@gmail.com',
        toName: 'Administrador',
        templateId: adminTemplateId,
        params: emailParams
      }).toPromise();
      
      // ✅ Mensaje final
      await Swal.fire({
        title: '¡Solicitud exitosa!',
        html: `
          <div class="text-center">
            <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
            <p class="mb-2">Gracias por tu solicitud de viaje.</p>
            <p class="text-sm text-gray-600">Hemos enviado los detalles a <strong>${formValues.email}</strong></p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Aceptar',
        buttonsStyling: false,
        customClass: { confirmButton: 'confirmar' }
      });
  
      this.volver();
  
    } catch (error) {
      console.error('Error procesando la solicitud:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        buttonsStyling: false,
        customClass: { confirmButton: 'confirmar' }
      });
    }
  }
  
  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
  getClienteTemplateId(tipoServicio: string): number {
    switch (tipoServicio) {
      case 'aeropuerto': return 1;
      case 'punto': return 3;
      case 'hora': return 4;
      default: return 1; // Default a aeropuerto si no se reconoce
    }
  }
  
  getAdminTemplateId(): number {
    return 2; // El admin siempre recibe la plantilla con ID 2
  }
  
  
  
}
