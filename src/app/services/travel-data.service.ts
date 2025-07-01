// travel-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TravelDataService {
  private originSubject = new BehaviorSubject<string>('taganga');
  private destinationSubject = new BehaviorSubject<string>('santa marta magdalena calle 18 7a');

  origin$ = this.originSubject.asObservable();
  destination$ = this.destinationSubject.asObservable();

  setTravelData(origin: string, destination: string) {
    this.originSubject.next(origin);
    this.destinationSubject.next(destination);
  }

  resetAllData(): void {
    // Reset the BehaviorSubjects to their default values
    this.originSubject.next('taganga');
    this.destinationSubject.next('santa marta magdalena calle 18 7a');
  }
}
