import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CotizadorService {
  public tarifaTotalSubject = new BehaviorSubject<number>(0);
  public distanciaKmSubject = new BehaviorSubject<number>(0);

  tarifaTotal$ = this.tarifaTotalSubject.asObservable();
  distanciaKm$ = this.distanciaKmSubject.asObservable();

  setTarifaTotal(valor: number) {
    this.tarifaTotalSubject.next(valor);
  }
// cotizador.service.ts
public distanciaKm = new BehaviorSubject<number>(0);

setDistanciaKm(km: number) {
  this.distanciaKm.next(km);
}

public duracionHoras = new BehaviorSubject<number>(2);

setDuracionHoras(horas: number) {
  this.duracionHoras.next(horas);
}

getDuracionHoras(): number {
  return this.duracionHoras.getValue();
}

getDistanciaKm(): number {
  return this.distanciaKm.getValue();
}

}
