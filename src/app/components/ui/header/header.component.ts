import { Component } from '@angular/core';
import { VirtualRouterService } from '../../../services/virtual-router.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
constructor(public virtualRouterService: VirtualRouterService){
  
}
}
