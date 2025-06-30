import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtualRouterService } from '../../../services/virtual-router.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  constructor(public virtualRouterService: VirtualRouterService) {}
}
