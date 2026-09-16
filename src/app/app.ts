import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

interface Service { icon: string; title: string; text: string; tags: string[]; }
interface Project { title: string; type: string; text: string; accent: string; number: string; tech: string[]; github?: string; }
interface User { id: string; name: string; email: string; role: 'customer' | 'admin'; }
interface Testimonial { name: string; role: string; text: string; }
interface DashboardMessage { id: string; name: string; email: string; message: string; status: 'new' | 'read'; createdAt: string; }
interface DashboardCustomer { id: string; name: string; email: string; role: string; createdAt: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly apiUrl = 'http://localhost:3001/api';
  menuOpen = signal(false);
  sent = signal(false);
  sending = signal(false);
  sendError = signal('');
  authOpen = signal(false);
  authMode = signal<'login' | 'signup'>('login');
  authError = signal('');
  authBusy = signal(false);
  currentCustomer = signal<User | null>(null);
  language = signal<'en' | 'ar'>('en');
  theme = signal<'dark' | 'light'>('dark');
  loading = signal(true);
  notFound = signal(false);
  cursorX = signal(0);
  cursorY = signal(0);
  selectedProject = signal<Project | null>(null);
  adminOpen = signal(false);
  adminLoading = signal(false);
  adminError = signal('');
  adminStats = signal({ customers: 0, messages: 0, unreadMessages: 0 });
  adminMessages = signal<DashboardMessage[]>([]);
  adminCustomers = signal<DashboardCustomer[]>([]);
  revealReady = signal(false);

  services: Service[] = [
    { icon: '◈', title: 'Business Websites', text: 'Clean, trustworthy websites that turn visitors into real customers.', tags: ['Responsive', 'SEO-ready'] },
    { icon: '⌁', title: 'Restaurants & Cafés', text: 'Digital experiences for menus, reservations, locations and brand stories.', tags: ['Menus', 'Bookings'] },
    { icon: '◇', title: 'Fashion & E-commerce', text: 'Modern storefronts designed around products, conversion and a strong visual identity.', tags: ['Catalogs', 'Checkout'] },
    { icon: '↗', title: 'Custom Web Apps', text: 'Full-stack applications with secure APIs, databases and smooth user flows.', tags: ['Angular', 'Node.js'] }
  ];

  businessTypes = [
    { icon: '🍽️', title: 'Restaurants', text: 'Menus, reservations, locations and a premium food-first experience.' },
    { icon: '☕', title: 'Cafés', text: 'A warm digital presence with menus, offers, maps and social links.' },
    { icon: '👕', title: 'Fashion Brands', text: 'Visual storefronts that make collections and products easy to explore.' },
    { icon: '🛒', title: 'E-commerce', text: 'Product discovery, cart flows and scalable customer experiences.' },
    { icon: '🏢', title: 'Companies', text: 'Professional websites that explain services and build trust.' },
    { icon: '⚡', title: 'Custom Apps', text: 'Dashboards, booking systems and business tools built around your workflow.' }
  ];

  projects: Project[] = [
    { number: '01', title: 'CineBook', type: 'Movie Booking Platform', text: 'A complete booking experience with movies, cinemas, shows, seats and customer tickets.', accent: 'violet', tech: ['Angular', 'Node.js', 'Express', 'SQLite'], github: 'https://github.com/ToPaK1/movie-booking-backend' },
    { number: '02', title: 'Restaurant Experience', type: 'Business Website Concept', text: 'A premium restaurant presence focused on menu discovery, atmosphere and reservations.', accent: 'orange', tech: ['Angular', 'Responsive UI', 'REST API'] },
    { number: '03', title: 'Fashion Store', type: 'E-commerce Concept', text: 'A clean storefront concept built around collections, product discovery and mobile shopping.', accent: 'blue', tech: ['Angular', 'TypeScript', 'Node.js'] }
  ];

  testimonials: Testimonial[] = [
    { name: 'Business Owner', role: 'Restaurant', text: 'Demo placeholder — this card is ready for a real client review once the first project launches.' },
    { name: 'Brand Founder', role: 'Fashion', text: 'Demo placeholder — replace this with verified feedback from a real client or business owner.' },
    { name: 'Startup Team', role: 'Technology', text: 'Demo placeholder — the layout is designed to showcase short, credible customer feedback.' }
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

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('webdev_user');
    if (savedUser) {
      try { this.currentCustomer.set(JSON.parse(savedUser)); } catch { localStorage.removeItem('webdev_user'); }
    }
    const savedTheme = localStorage.getItem('webdev_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') this.theme.set(savedTheme);
  }

  ngOnInit() {
    this.notFound.set(location.pathname !== '/' && location.pathname !== '/index.html');
    setTimeout(() => { this.loading.set(false); this.revealReady.set(true); }, 650);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) { this.cursorX.set(event.clientX); this.cursorY.set(event.clientY); }

  isArabic() { return this.language() === 'ar'; }
  toggleLanguage() { this.language.update(value => value === 'en' ? 'ar' : 'en'); }
  isLightMode() { return this.theme() === 'light'; }
  isAdmin() { return this.currentCustomer()?.role === 'admin'; }
  toggleTheme() { const nextTheme = this.theme() === 'dark' ? 'light' : 'dark'; this.theme.set(nextTheme); localStorage.setItem('webdev_theme', nextTheme); }
  toggleMenu() { this.menuOpen.update(value => !value); }
  closeMenu() { this.menuOpen.set(false); }

  openAuth(mode: 'login' | 'signup') { this.authMode.set(mode); this.authError.set(''); this.authForm.reset(); this.authOpen.set(true); this.closeMenu(); }
  closeAuth() { this.authOpen.set(false); this.authError.set(''); }
  switchAuthMode() { this.authMode.update(mode => mode === 'login' ? 'signup' : 'login'); this.authError.set(''); this.authForm.reset(); }

  submitAuth() {
    if (this.authForm.invalid) { this.authForm.markAllAsTouched(); return; }
    this.authBusy.set(true); this.authError.set('');
    const mode = this.authMode();
    const payload = { name: this.authForm.controls.name.value.trim(), email: this.authForm.controls.email.value.trim().toLowerCase(), password: this.authForm.controls.password.value };
    this.http.post<{ token: string; user: User }>(`${this.apiUrl}/auth/${mode}`, payload).subscribe({
      next: response => { localStorage.setItem('webdev_token', response.token); localStorage.setItem('webdev_user', JSON.stringify(response.user)); this.currentCustomer.set(response.user); this.authBusy.set(false); this.closeAuth(); },
      error: error => { this.authBusy.set(false); this.authError.set(error?.error?.message || 'Could not connect to the WEBDEV API. Start the backend with npm run api.'); }
    });
  }

  logout() { localStorage.removeItem('webdev_token'); localStorage.removeItem('webdev_user'); this.currentCustomer.set(null); this.adminOpen.set(false); }

  submitForm() {
    if (this.contactForm.invalid) { this.contactForm.markAllAsTouched(); return; }
    this.sending.set(true); this.sent.set(false); this.sendError.set('');
    this.http.post<{ message: string }>(`${this.apiUrl}/contact`, this.contactForm.getRawValue()).subscribe({
      next: () => { this.sending.set(false); this.sent.set(true); this.contactForm.reset(); },
      error: error => { this.sending.set(false); this.sendError.set(error?.error?.message || 'Could not send your message. Start the WEBDEV API and try again.'); }
    });
  }

  openProject(project: Project) { this.selectedProject.set(project); }
  closeProject() { this.selectedProject.set(null); }
  scrollToContact() { document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }

  openAdmin() { if (!this.isAdmin()) return; this.adminOpen.set(true); this.loadAdminDashboard(); }
  closeAdmin() { this.adminOpen.set(false); }
  loadAdminDashboard() {
    const token = localStorage.getItem('webdev_token');
    if (!token) return;
    this.adminLoading.set(true); this.adminError.set('');
    this.http.get<{ stats: { customers: number; messages: number; unreadMessages: number }; customers: DashboardCustomer[]; messages: DashboardMessage[] }>(`${this.apiUrl}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: data => { this.adminStats.set(data.stats); this.adminCustomers.set(data.customers); this.adminMessages.set(data.messages); this.adminLoading.set(false); },
      error: error => { this.adminLoading.set(false); this.adminError.set(error?.error?.message || 'Unable to load admin data.'); }
    });
  }
  markMessageRead(id: string) {
    const token = localStorage.getItem('webdev_token');
    if (!token) return;
    this.http.patch<DashboardMessage>(`${this.apiUrl}/admin/messages/${id}`, { status: 'read' }, { headers: { Authorization: `Bearer ${token}` } }).subscribe({ next: () => this.loadAdminDashboard() });
  }
}
