import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GoogleMapsService {
  map!: google.maps.Map;
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  originAutocomplete!: google.maps.places.Autocomplete;
  destinationAutocomplete!: google.maps.places.Autocomplete;

  initMap(mapContainer: HTMLElement, center: google.maps.LatLngLiteral = { lat: 4.711, lng: -74.0721 }) {
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

    this.map = new google.maps.Map(mapContainer, {
      center,
      zoom: 13,
      styles: styles,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });
    
    this.directionsRenderer.setMap(this.map);
  }

  setupAutocomplete(originEl: HTMLInputElement, destinationEl: HTMLInputElement) {
    this.originAutocomplete = new google.maps.places.Autocomplete(originEl);
    this.destinationAutocomplete = new google.maps.places.Autocomplete(destinationEl);
  }

  calcularRuta(callback: (km: number, originText: string, destText: string) => void) {
    const originPlace = this.originAutocomplete.getPlace();
    const destinationPlace = this.destinationAutocomplete.getPlace();
  
    const originLoc = originPlace?.geometry?.location;
    const destinationLoc = destinationPlace?.geometry?.location;
  
    if (!originLoc || !destinationLoc || !originPlace.formatted_address || !destinationPlace.formatted_address) {
      alert('Debes seleccionar origen y destino válidos desde las sugerencias.');
      return;
    }
  
    const origin: google.maps.LatLngLiteral = {
      lat: originLoc.lat(),
      lng: originLoc.lng()
    };
  
    const destination: google.maps.LatLngLiteral = {
      lat: destinationLoc.lat(),
      lng: destinationLoc.lng()
    };
  
    this.directionsService.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK' && result) {
        this.directionsRenderer.setDirections(result);
        const route = result.routes[0];
        const distanceInMeters = route.legs[0].distance?.value || 0;
        callback(distanceInMeters / 1000, originPlace.formatted_address!, destinationPlace.formatted_address!);
      } else {
        alert('No se pudo calcular la ruta.');
      }
    });
  }
}
