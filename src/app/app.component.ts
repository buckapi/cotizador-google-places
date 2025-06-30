import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/ui/header/header.component';
import { OneComponent } from './components/one/one.component';
import { TwoComponent } from './components/two/two.component';
import { ThreeComponent } from './components/three/three.component';
import { VirtualRouterService } from './services/virtual-router.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule,HeaderComponent,OneComponent,TwoComponent,ThreeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'cotizador';
  constructor(public virtualRouterService: VirtualRouterService){}
}
