import { Component, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

interface Service { icon: string; title: string; text: string; tags: string[]; }
interface Project { title: string; type: string; text: string; accent: string; number: string; }
interface Customer { name: string; email: string; passwordHash: string; }
interface Testimonial { name: string; role: string; text: string; }

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
  authOpen = signal(false);
  authMode = signal<'login' | 'signup'>('login');
  authError = signal('');
  currentCustomer = signal<Customer | null>(null);
  language = signal<'en' | 'ar'>('en');

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

  testimonials: Testimonial[] = [
    { name: 'Business Owner', role: 'Restaurant', text: 'The goal is simple: a website that feels premium, loads fast and makes it easy for customers to take action.' },
    { name: 'Brand Founder', role: 'Fashion', text: 'A strong digital presence can make a growing brand look established from the very first visit.' },
    { name: 'Startup Team', role: 'Technology', text: 'From the interface to the API, every part of the product should work together as one experience.' }
  ];

  contactForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] })
  });

  authForm = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] })
  });

  constructor() {
    const saved = localStorage.getItem('webdev_customer_session');
    if (saved) this.currentCustomer.set(JSON.parse(saved));
  }

  isArabic() { return this.language() === 'ar'; }
  toggleLanguage() { this.language.update(value => value === 'en' ? 'ar' : 'en'); }
  toggleMenu() { this.menuOpen.update(value => !value); }
  closeMenu() { this.menuOpen.set(false); }

  openAuth(mode: 'login' | 'signup') {
    this.authMode.set(mode);
    this.authError.set('');
    this.authForm.reset();
    this.authOpen.set(true);
    this.closeMenu();
  }

  closeAuth() { this.authOpen.set(false); this.authError.set(''); }

  switchAuthMode() {
    this.authMode.update(mode => mode === 'login' ? 'signup' : 'login');
    this.authError.set('');
    this.authForm.reset();
  }

  async hashPassword(password: string): Promise<string> {
    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async submitAuth() {
    if (this.authForm.invalid) { this.authForm.markAllAsTouched(); return; }
    const email = this.authForm.controls.email.value.trim().toLowerCase();
    const password = this.authForm.controls.password.value;
    const customers: Customer[] = JSON.parse(localStorage.getItem('webdev_customers') || '[]');
    const passwordHash = await this.hashPassword(password);

    if (this.authMode() === 'signup') {
      const name = this.authForm.controls.name.value.trim();
      if (!name) { this.authError.set('Please enter your name.'); return; }
      if (customers.some(customer => customer.email === email)) { this.authError.set('An account with this email already exists.'); return; }
      const customer: Customer = { name, email, passwordHash };
      customers.push(customer);
      localStorage.setItem('webdev_customers', JSON.stringify(customers));
      localStorage.setItem('webdev_customer_session', JSON.stringify(customer));
      this.currentCustomer.set(customer);
      this.closeAuth();
      return;
    }

    const customer = customers.find(item => item.email === email && item.passwordHash === passwordHash);
    if (!customer) { this.authError.set('Invalid email or password.'); return; }
    localStorage.setItem('webdev_customer_session', JSON.stringify(customer));
    this.currentCustomer.set(customer);
    this.closeAuth();
  }

  logout() {
    localStorage.removeItem('webdev_customer_session');
    this.currentCustomer.set(null);
  }

  submitForm() {
    if (this.contactForm.invalid) { this.contactForm.markAllAsTouched(); return; }
    this.sent.set(true);
    this.contactForm.reset();
  }
}
