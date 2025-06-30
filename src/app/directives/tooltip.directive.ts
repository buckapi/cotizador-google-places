// tooltip.directive.ts
import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    Renderer2,
    OnDestroy,
    OnInit
  } from '@angular/core';
  
  @Directive({
    selector: '[tooltip]',
    standalone: true
  })
  export class TooltipDirective implements OnInit, OnDestroy {
    @Input('tooltip') tooltipText = '';
    private tooltipElement!: HTMLElement;
  
    constructor(private el: ElementRef, private renderer: Renderer2) {}
  
    ngOnInit() {
      this.tooltipElement = this.renderer.createElement('div');
      this.renderer.addClass(this.tooltipElement, 'tooltip-box');
      this.renderer.setStyle(this.tooltipElement, 'display', 'none');
      this.renderer.appendChild(document.body, this.tooltipElement);
    }
  
    @HostListener('mouseenter')
    onMouseEnter() {
      this.tooltipElement.innerText = this.tooltipText;
      this.renderer.setStyle(this.tooltipElement, 'display', 'block');
      const rect = this.el.nativeElement.getBoundingClientRect();
      this.renderer.setStyle(this.tooltipElement, 'top', `${rect.top - 40}px`);
      this.renderer.setStyle(this.tooltipElement, 'left', `${rect.left}px`);
    }
  
    @HostListener('mouseleave')
    onMouseLeave() {
      this.renderer.setStyle(this.tooltipElement, 'display', 'none');
    }
  
    ngOnDestroy() {
      this.renderer.removeChild(document.body, this.tooltipElement);
    }
  }
  