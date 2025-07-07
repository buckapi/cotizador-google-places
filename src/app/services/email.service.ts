import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private baseUrl = 'https://db.buckapi.lat:5542';

  constructor(private http: HttpClient) {}

  enviarCorreo(tipoServicio: 'aeropuerto' | 'punto' | 'hora', data: {
    toEmail: string;
    toName: string;
    templateId: number;
    params?: Record<string, any>;
  }) {
    const route = this.getClienteRoute(tipoServicio);
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/${route}`, data).pipe(
      catchError(error => {
        console.error('Error enviando el correo:', error);
        return of({ success: false, message: 'Error enviando el correo' });
      })
    );
  }

  enviarCorreoAdmin(data: {
    toEmail: string;
    toName: string;
    templateId: number;
    params?: Record<string, any>;
  }) {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/solicitudAdmin`, data).pipe(
      catchError(error => {
        console.error('Error enviando correo al admin:', error);
        return of({ success: false, message: 'Error enviando correo al admin' });
      })
    );
  }

  private getClienteRoute(tipoServicio: 'aeropuerto' | 'punto' | 'hora'): string {
    switch (tipoServicio) {
      case 'aeropuerto': return 'solicitudaeropuerto';
      case 'punto': return 'solicitudp2p';
      case 'hora': return 'solicitudxhora';
      default: return 'solicitudaeropuerto';
    }
  }
}
