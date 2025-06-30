import { Injectable } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { from } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MapboxService {
  map!: mapboxgl.Map;
  private originMarker!: mapboxgl.Marker;
  private destinationMarker!: mapboxgl.Marker;
  public isMapReady = false;

  directionsApi = 'https://api.mapbox.com/directions/v5/mapbox/driving';

  initMap(container: HTMLElement, token: string, center: [number, number]) {
    this.map = new mapboxgl.Map({
      container: container,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 10,
      accessToken: token
    });
  
    this.map.addControl(new mapboxgl.NavigationControl());
  
    this.map.on('load', () => {
      this.isMapReady = true;
    });
  }
  
  searchPlaces(query: string, token: string): Promise<any[]> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&limit=3&access_token=${token}`;
    return fetch(url)
      .then(res => res.json())
      .then(data => data.features || []);
  }

  /**
   * Geocode an address to get its coordinates
   * @param address The address to geocode
   * @returns Promise with the geocoding response
   */
  async geocodeAddress(address: string): Promise<any> {
    const token = 'pk.eyJ1IjoiY29uZWN0YXZldC1jb20iLCJhIjoiY20ybDZpc2dmMDhpMDJpb21iZGI1Y2ZoaCJ9.WquhO_FA_2FM0vhYBaZ_jg';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&access_token=${token}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error in geocodeAddress:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Mapbox Directions API
   * @param origin Origin coordinates [longitude, latitude]
   * @param destination Destination coordinates [longitude, latitude]
   * @returns Distance in kilometers
   */
  async getDistanceFromMapbox(origin: [number, number], destination: [number, number]): Promise<number> {
    const token = 'pk.eyJ1IjoiY29uZWN0YXZldC1jb20iLCJhIjoiY20ybDZpc2dmMDhpMDJpb21iZGI1Y2ZoaCJ9.WquhO_FA_2FM0vhYBaZ_jg';
    const [originLng, originLat] = origin;
    const [destLng, destLat] = destination;
    
    // const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${token}&geometries=geojson`;
    // const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${token}&geometries=geojson`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${token}&geometries=geojson&radiuses=1000;1000`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to get distance: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        // Convert meters to kilometers and round to 2 decimal places
        const distanceInKm = Math.round((data.routes[0].distance / 1000) * 100) / 100;
        return distanceInKm;
      }
      
      throw new Error('No route found');
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw new Error('Error al calcular la distancia. Por favor intenta de nuevo.');
    }
  }
  async setMarkersAndDrawRoute(
    origin: [number, number],
    destination: [number, number],
    token: string,
    onRouteUpdated: (distanceKm: number, originText: string, destinationText: string) => void
  ) {
    if (!this.originMarker) {
      this.originMarker = new mapboxgl.Marker({
        draggable: true,
        element: this.createCustomMarker('blue')
      })
        .setLngLat(origin)
        .addTo(this.map)
        .on('dragend', () => this.updateRouteFromMarkers(token, onRouteUpdated));
    } else {
      this.originMarker.setLngLat(origin);
    }
  
    if (!this.destinationMarker) {
      this.destinationMarker = new mapboxgl.Marker({
        draggable: true,
        element: this.createCustomMarker('red')
      })
        .setLngLat(destination)
        .addTo(this.map)
        .on('dragend', () => this.updateRouteFromMarkers(token, onRouteUpdated));
    } else {
      this.destinationMarker.setLngLat(destination);
    }
  
    const [originText, destinationText] = await Promise.all([
      this.reverseGeocode(origin, token),
      this.reverseGeocode(destination, token)
    ]);
    const distance = await this.drawRoute(origin, destination, token);
    onRouteUpdated(distance, originText, destinationText);
  }
  
  async reverseGeocode(coord: [number, number], token: string): Promise<string> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coord[0]},${coord[1]}.json?access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.features[0]?.place_name || 'Dirección desconocida';
  }
  private createCustomMarker(color: string): HTMLElement {
    const el = document.createElement('div');
    el.style.backgroundColor = color;
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.4)';
    el.style.cursor = 'pointer';
    return el;
  }
  
  private async updateRouteFromMarkers(
    token: string,
    callback: (distanceKm: number, newOriginText: string, newDestinationText: string) => void
  ) {
    const origin = this.originMarker.getLngLat();
    const destination = this.destinationMarker.getLngLat();
  
    const [originText, destinationText] = await Promise.all([
      this.reverseGeocode([origin.lng, origin.lat], token),
      this.reverseGeocode([destination.lng, destination.lat], token)
    ]);
  
    const distance = await this.drawRoute([origin.lng, origin.lat], [destination.lng, destination.lat], token);
  
    callback(distance, originText, destinationText);
  }
  isReady(): boolean {
    return !!this.map && this.isMapReady;
  }
  async drawRoute(origin: [number, number], destination: [number, number], token: string): Promise<number> {
    if (!this.map) {
      console.error('❌ El mapa no ha sido inicializado con initMap().');
      throw new Error('El mapa no está disponible.');
    }
  
    const url = `${this.directionsApi}/${origin.join(',')};${destination.join(',')}?geometries=geojson&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
  
    if (!data.routes || !data.routes.length) return 0;
  
    const route = data.routes[0];
    const geometry = route.geometry;
  
    // Agregar o actualizar ruta
    const source = this.map.getSource('route') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        geometry,
        properties: {}
      });
    } else {
      this.map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry,
          properties: {}
        }
      });
  
      this.map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#000000',
          'line-width': 3,
          'line-dasharray': [2, 4]
        }
      });
    }
  
    // Ajustar la vista
    const bounds = new mapboxgl.LngLatBounds();
    geometry.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
    this.map.fitBounds(bounds, { padding: 50 });
  
    return route.distance / 1000;
  }
  
  
}
