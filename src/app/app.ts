import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

interface Service { icon: string; title: string; text: string; tags: string[]; }
interface Project { title: string; type: string; text: string; accent: string; number: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  menuOpen = signal(false);
  sent = signal(false);

  services: Service[] = [
    { icon: '◈', title: 'Business Websites', text: 'Clean, trustworthy websites that turn visitors into real customers.', tags: ['Responsive', 'SEO-ready'] },
    { icon: '⌁', title: 'Restaurants & Cafés', text: 'Digital experiences for menus, reservations, locations and brand stories.', tags: ['Menus', 'Bookings'] },
    { icon: '◇', title: 'Fashion & E-commerce', text: 'Modern storefronts designed around products, conversion and a strong visual identity.', tags: ['Catalogs', 'Checkout'] },
    { icon: '↗', title: 'Custom Web Apps', text: 'Full-stack applications with secure APIs, databases and smooth user flows.', tags: ['Angular', 'Node.js'] }
  ];

  projects: Project[] = [
    { number: '01', title: 'CineBook', type: 'Movie Booking Platform', text: 'A complete booking experience with movies, cinemas, shows, seats and customer tickets.', accent: 'violet' },
    { number: '02', title: 'Restaurant Experience', type: 'Business Website Concept', text: 'A premium restaurant presence focused on menu discovery, atmosphere and reservations.', accent: 'orange' },
    { number: '03', title: 'Fashion Store', type: 'E-commerce Concept', text: 'A clean storefront concept built around collections, product discovery and mobile shopping.', accent: 'blue' }
  ];

  contactForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] })
  });

  toggleMenu() { this.menuOpen.update(value => !value); }
  closeMenu() { this.menuOpen.set(false); }
  submitForm() {
    if (this.contactForm.invalid) { this.contactForm.markAllAsTouched(); return; }
    this.sent.set(true);
    this.contactForm.reset();
  }
}
