
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Tramo {
  tipo: 'fijo' | 'por_intervalo';
  descripcion: string;
  kmDesde?: number;
  kmHasta?: number;
  unidadCadaKm?: number;
  tarifas: Record<string, number | Record<string, number>>;
}

@Injectable({ providedIn: 'root' })
export class TramosService {
  private tramos: Tramo[] = [];
  private readonly endpoint = 'https://db.buckapi.lat:7752/api/tramos';

  constructor(private http: HttpClient) {}

  async cargarTramos(): Promise<void> {
    this.tramos = await firstValueFrom(this.http.get<Tramo[]>(this.endpoint));
  }

  calcularTarifa(distanciaKm: number, servicio: 'aeropuerto_hotel' | 'punto_a_punto', vehiculo: string): number {
    if (!this.tramos.length) {
      console.warn('Tramos no cargados');
      return 0;
    }
  
    let tarifaTotal = 0;

    // 1. Base fija (0-10 km)
    const tramoFijo = this.tramos.find(t => t.tipo === 'fijo');
    if (tramoFijo) {
      const precioBase = (tramoFijo.tarifas as Record<string, Record<string, number>>)[servicio]?.[vehiculo] ?? 0;
      tarifaTotal += precioBase;
    }

    // 2. Encontrar intervalo que cubre la distancia (> 10 km)
    if (distanciaKm > 10) {
      const tramoVariable = this.tramos
        .filter(t => t.tipo === 'por_intervalo')
        .find(t => distanciaKm > (t.kmDesde ?? 0) && distanciaKm <= (t.kmHasta ?? Number.MAX_SAFE_INTEGER));

      if (tramoVariable) {
        const precioPorUnidad = (tramoVariable.tarifas as Record<string, number>)[vehiculo] || 0;
        const unidad = tramoVariable.unidadCadaKm ?? 1;
        const kmExtras = distanciaKm - 10;
        const precioPorKm = precioPorUnidad / unidad;
        tarifaTotal += kmExtras * precioPorKm;
      }
    }

    return tarifaTotal;
  
    // MODO ACUMULATIVO ORIGINAL COMENTADO POR CAMBIO DE REGLA DE NEGOCIO
    /* for (const tramo of this.tramos) {
      if (tramo.tipo === 'fijo') {
        const tarifasServicio = tramo.tarifas as Record<string, Record<string, number>>;
        const precio = tarifasServicio?.[servicio]?.[vehiculo];
        if (precio) tarifaTotal += precio;
      }
  
      if (tramo.tipo === 'por_intervalo') {
        const precioPorUnidad = (tramo.tarifas as Record<string, number>)[vehiculo] || 0;
  
        if (
          tramo.kmDesde !== undefined &&
          tramo.kmHasta !== undefined &&
          tramo.unidadCadaKm !== undefined &&
          distanciaKm > tramo.kmDesde
        ) {
          const hasta = Math.min(distanciaKm, tramo.kmHasta);
          const distanciaTramo = hasta - tramo.kmDesde;
          const unidades = Math.ceil(distanciaTramo / tramo.unidadCadaKm);
          tarifaTotal += unidades * precioPorUnidad;
        }
      }
    }
  
    */
    // return tarifaTotalOriginal;
    
  }
  
}
