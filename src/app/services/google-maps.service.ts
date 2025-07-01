import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class GoogleMapsService {
  private map!: google.maps.Map;
  private markers: google.maps.Marker[] = [];
  private stylesEnabled = true;
  private mapReady = false; // bandera para verificar si el mapa está listo
  private mapStyles = [
    {
      featureType: 'poi',
      elementType: 'all',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      elementType: 'all',
      stylers: [{ visibility: 'off' }]
    }
  ];

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  originAutocomplete!: google.maps.places.Autocomplete;
  destinationAutocomplete!: google.maps.places.Autocomplete;

  initMap(mapContainer: HTMLElement, center: google.maps.LatLngLiteral = { lat: 4.711, lng: -74.0721 }): Promise<void> {
    return new Promise((resolve) => {
      const styles = [
        {
          featureType: 'all',
          elementType: 'all',
          stylers: [
            { saturation: -100 },
            { lightness: 45 },
            { gamma: 1.0 }
          ]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#e9e9e9' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [
            { lightness: 70 },
            { visibility: 'simplified' }
          ]
        },
        ...this.mapStyles
      ];
  
      this.map = new google.maps.Map(mapContainer, {
        center,
        zoom: 13,
        styles: this.stylesEnabled ? styles : [],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
  
      this.directionsRenderer.setMap(this.map);
      this.mapReady = true;
  
      console.log('✅ Mapa inicializado');
      resolve();
    });
  }
  
  isMapReady(): boolean {
    return this.mapReady;
  }

  setupAutocomplete(originEl: HTMLInputElement | null, destinationEl: HTMLInputElement) {
    if (originEl) {
      this.originAutocomplete = new google.maps.places.Autocomplete(originEl);
    }

    this.destinationAutocomplete = new google.maps.places.Autocomplete(destinationEl);
  }

  toggleMapStyles(): void {
    this.stylesEnabled = !this.stylesEnabled;
    if (this.map) {
      this.map.setOptions({
        styles: this.stylesEnabled ? [
          {
            stylers: [
              { lightness: 70 },
              { visibility: 'simplified' }
            ]
          },
          ...this.mapStyles
        ] : []
      });
    }
  }

  async calcularRuta(
    callback: (km: number, originText: string, destText: string) => void,
    originCoords?: [number, number],
    destinationCoords?: [number, number],
    originText?: string,
    destinationText?: string
  ) {
    let origin: google.maps.LatLngLiteral;
    let destination: google.maps.LatLngLiteral;
    let originAddress = originText || '';
    let destAddress = destinationText || '';

    if (originCoords && destinationCoords) {
      origin = { lat: originCoords[1], lng: originCoords[0] };
      destination = { lat: destinationCoords[1], lng: destinationCoords[0] };

      if (!originAddress || !destAddress) {
        const geocoder = new google.maps.Geocoder();
        try {
          const originResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ location: origin }, (results, status) => {
              if (status === 'OK' && results) resolve(results);
              else reject(status);
            });
          });

          const destResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ location: destination }, (results, status) => {
              if (status === 'OK' && results) resolve(results);
              else reject(status);
            });
          });

          if (originResult[0]?.formatted_address) originAddress = originResult[0].formatted_address;
          if (destResult[0]?.formatted_address) destAddress = destResult[0].formatted_address;
        } catch (error) {
          console.error('Error al obtener las direcciones:', error);
        }
      }
    } else {
      const originPlace = this.originAutocomplete?.getPlace();
      const destinationPlace = this.destinationAutocomplete?.getPlace();

      const originLoc = originPlace?.geometry?.location;
      const destinationLoc = destinationPlace?.geometry?.location;

      if (!originLoc || !destinationLoc || !originPlace.formatted_address || !destinationPlace.formatted_address) {
        await Swal.fire({
          title: 'Validación requerida',
          text: 'Debes seleccionar origen y destino válidos desde las sugerencias.',
          icon: 'warning',
          confirmButtonText: 'Entendido',
          buttonsStyling: false,
          customClass: {
            confirmButton: 'confirmar'
          }
        });
        return;
      }

      origin = { lat: originLoc.lat(), lng: originLoc.lng() };
      destination = { lat: destinationLoc.lat(), lng: destinationLoc.lng() };
      originAddress = originPlace.formatted_address;
      destAddress = destinationPlace.formatted_address;
    }

    this.directionsService.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK' && result) {
        this.directionsRenderer.setDirections(result);
        const route = result.routes[0];
        const distanceInMeters = route.legs[0].distance?.value || 0;
        callback(distanceInMeters / 1000, originAddress, destAddress);
      } else {
        console.error('No se pudo calcular la ruta:', status);
        callback(0, originAddress, destAddress);
      }
    });
  }

  async addPickupMarker(location: { lat: number, lng: number }, title: string = 'Punto de recogida') {
    if (!this.mapReady || !this.map) {
      console.warn('Esperando inicialización del mapa para agregar marcador...');
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!this.mapReady || !this.map) return;
    }
  
    this.clearMarkers();
  
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      title,
      animation: google.maps.Animation.DROP
    });
  
    this.markers.push(marker);
    this.map.panTo(location);
  }
  

  clearMarkers() {
    for (let marker of this.markers) {
      marker.setMap(null);
    }
    this.markers = [];
  }

  centerMap(location: { lat: number, lng: number }) {
    if (this.mapReady && this.map) {
      this.map.panTo(location);
      this.map.setZoom(14);
    }
  }
}
