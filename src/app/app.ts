import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

interface Service { icon: string; title: string; text: string; tags: string[]; }
interface Project { id?: string; title: string; type: string; text: string; accent: string; number: string; tech: string[]; github?: string; }
interface User { id: string; name: string; email: string; role: 'customer' | 'admin'; }
interface Testimonial { name: string; role: string; text: string; }
interface DashboardMessage { id: string; name: string; email: string; message: string; status: 'new' | 'read'; createdAt: string; }
interface DashboardCustomer { id: string; name: string; email: string; role: string; createdAt: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly apiUrl = 'http://localhost:3001/api';
  readonly currentYear = new Date().getFullYear();

  menuOpen = signal(false);
  sent = signal(false);
  sending = signal(false);
  sendErrorMessage = signal('');
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
  scrollY = signal(0);
  selectedProject = signal<Project | null>(null);
  adminOpen = signal(false);
  adminLoading = signal(false);
  adminError = signal('');
  adminStats = signal({ customers: 0, messages: 0, unreadMessages: 0 });
  adminMessages = signal<DashboardMessage[]>([]);
  adminCustomers = signal<DashboardCustomer[]>([]);
  adminProjects = signal<Project[]>([]);
  revealReady = signal(false);
  heroWords = signal(['websites', 'experiences', 'web apps', 'digital products']);
  activeHeroWord = signal(0);

  contact = {
    name: '',
    email: '',
    business: '',
    project: '',
    message: ''
  };

  services: Service[] = [
    { icon: '◈', title: 'Business Websites', text: 'Clean, trustworthy websites that turn visitors into real customers.', tags: ['Responsive', 'SEO-ready'] },
    { icon: '⌁', title: 'Restaurants & Cafés', text: 'Digital experiences for menus, reservations, locations and brand stories.', tags: ['Menus', 'Bookings'] },
    { icon: '◇', title: 'Fashion & E-commerce', text: 'Modern storefronts designed around products, conversion and a strong visual identity.', tags: ['Catalogs', 'Checkout'] },
    { icon: '↗', title: 'Custom Web Apps', text: 'Full-stack applications with secure APIs, databases and smooth user flows.', tags: ['Angular', 'Node.js'] },
    { icon: '⚙', title: 'Fix & Upgrade Existing Websites', text: 'Fix bugs, repair broken features, improve speed, refresh the design and add new functionality to an existing website.', tags: ['Bug Fixes', 'Performance', 'Redesign'] }
  ];

  businessTypes = [
    { icon: '🍽️', title: 'Restaurants', text: 'Menus, reservations, locations and a premium food-first experience.' },
    { icon: '☕', title: 'Cafés', text: 'A warm digital presence with menus, offers, maps and social links.' },
    { icon: '👕', title: 'Fashion Brands', text: 'Visual storefronts that make collections and products easy to explore.' },
    { icon: '🛒', title: 'E-commerce', text: 'Product discovery, cart flows and scalable customer experiences.' },
    { icon: '🏢', title: 'Companies', text: 'Professional websites that explain services and build trust.' },
    { icon: '⚡', title: 'Custom Apps', text: 'Dashboards, booking systems and business tools built around your workflow.' },
    { icon: '🛠️', title: 'Existing Websites', text: 'Fix a broken website, modernize an old design, improve mobile experience or add the feature you need.' }
  ];

  projects: Project[] = [
    { id: '01', number: '01', title: 'CineBook', type: 'Movie Booking Platform', text: 'A complete booking experience with movies, cinemas, shows, seats and customer tickets.', accent: 'violet', tech: ['Angular', 'Node.js', 'Express', 'SQLite'], github: 'https://github.com/ToPaK1/movie-booking-backend' },
    { id: '02', number: '02', title: 'Restaurant Experience', type: 'Business Website Concept', text: 'A premium restaurant presence focused on menu discovery, atmosphere and reservations.', accent: 'orange', tech: ['Angular', 'Responsive UI', 'REST API'] },
    { id: '03', number: '03', title: 'Fashion Store', type: 'E-commerce Concept', text: 'A clean storefront concept built around collections, product discovery and mobile shopping.', accent: 'blue', tech: ['Angular', 'TypeScript', 'Node.js'] }
  ];

  testimonials: Testimonial[] = [
    { name: 'Business-first', role: 'Every project starts with the goal', text: 'I build around what the business needs: clear messaging, useful features and a smooth path from visitor to customer.' },
    { name: 'Full-stack', role: 'Frontend + Backend', text: 'I work across Angular, TypeScript, Node.js, Express, REST APIs and databases to build complete web experiences.' },
    { name: 'Responsive', role: 'Desktop + Mobile', text: 'Every interface is designed to stay clean, readable and easy to use across phones, tablets and desktop screens.' },
    { name: 'Built to grow', role: 'Clean foundation', text: 'The goal is not only a good-looking website, but a solid foundation that can evolve with the business.' }
  ];

  contactForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    business: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(5000)] })
  });

  authForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.minLength(2), Validators.maxLength(80)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6), Validators.maxLength(128)] })
  });

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('webdev_user');
    if (savedUser) {
      try { this.currentCustomer.set(JSON.parse(savedUser)); }
      catch { localStorage.removeItem('webdev_user'); }
    }
    const savedTheme = localStorage.getItem('webdev_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') this.theme.set(savedTheme);
    this.applyTheme(this.theme());
  }

  ngOnInit() {
    this.notFound.set(location.pathname !== '/' && location.pathname !== '/index.html');
    setTimeout(() => { this.loading.set(false); this.revealReady.set(true); }, 650);
    setInterval(() => this.activeHeroWord.update(i => (i + 1) % this.heroWords().length), 2600);
    this.adminProjects.set(this.projects);
  }

  @HostListener('window:scroll') onScroll() { this.scrollY.set(window.scrollY); }
  @HostListener('document:mousemove', ['$event']) onMouseMove(event: MouseEvent) { this.cursorX.set(event.clientX); this.cursorY.set(event.clientY); }

  isArabic() { return this.language() === 'ar'; }
  toggleLanguage() { this.language.update(value => value === 'en' ? 'ar' : 'en'); }
  isLightMode() { return this.theme() === 'light'; }
  isAdmin() { return this.currentCustomer()?.role === 'admin'; }
  toggleTheme() { const nextTheme = this.theme() === 'dark' ? 'light' : 'dark'; this.theme.set(nextTheme); localStorage.setItem('webdev_theme', nextTheme); this.applyTheme(nextTheme); }
  private applyTheme(theme: 'dark' | 'light') { document.body.classList.toggle('light-theme', theme === 'light'); document.documentElement.style.colorScheme = theme; }
  toggleMenu() { this.menuOpen.update(value => !value); }
  closeMenu() { this.menuOpen.set(false); }

  openAuth(mode: 'login' | 'signup') {
    this.authMode.set(mode);
    this.authError.set('');
    this.authForm.reset();
    if (mode === 'login') this.authForm.controls.name.clearValidators();
    else this.authForm.controls.name.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
    this.authForm.controls.name.updateValueAndValidity();
    this.authOpen.set(true);
    this.closeMenu();
  }

  closeAuth() { this.authOpen.set(false); this.authError.set(''); this.authBusy.set(false); }
  switchAuthMode() { this.openAuth(this.authMode() === 'login' ? 'signup' : 'login'); }

  submitAuth() {
    const mode = this.authMode();
    if (mode === 'login') this.authForm.controls.name.clearValidators();
    else this.authForm.controls.name.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
    this.authForm.controls.name.updateValueAndValidity();
    if (this.authForm.invalid) { this.authForm.markAllAsTouched(); return; }
    this.authBusy.set(true);
    this.authError.set('');
    const payload = {
      name: this.authForm.controls.name.value.trim(),
      email: this.authForm.controls.email.value.trim().toLowerCase(),
      password: this.authForm.controls.password.value
    };
    this.http.post<{ token: string; user: User }>(`${this.apiUrl}/auth/${mode}`, payload).subscribe({
      next: response => {
        localStorage.setItem('webdev_token', response.token);
        localStorage.setItem('webdev_user', JSON.stringify(response.user));
        this.currentCustomer.set(response.user);
        this.authBusy.set(false);
        this.closeAuth();
      },
      error: error => {
        this.authBusy.set(false);
        this.authError.set(error?.error?.message || 'Could not connect to the WEBDEV API. Start the backend with npm run api.');
      }
    });
  }

  logout() {
    localStorage.removeItem('webdev_token');
    localStorage.removeItem('webdev_user');
    this.currentCustomer.set(null);
    this.adminOpen.set(false);
  }

  submitForm() {
    if (!this.contact.name.trim() || !this.contact.email.trim() || !this.contact.message.trim()) return;
    this.sending.set(true);
    this.sent.set(false);
    this.sendErrorMessage.set('');
    const payload = {
      name: this.contact.name.trim(),
      email: this.contact.email.trim().toLowerCase(),
      business: this.contact.business.trim(),
      message: this.contact.project.trim() ? `[${this.contact.project.trim()}] ${this.contact.message.trim()}` : this.contact.message.trim()
    };
    this.http.post<{ message: string }>(`${this.apiUrl}/contact`, payload).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
        this.contact = { name: '', email: '', business: '', project: '', message: '' };
      },
      error: error => {
        this.sending.set(false);
        this.sendErrorMessage.set(error?.error?.message || 'Could not send your message. Start the WEBDEV API and try again.');
      }
    });
  }

  submitContact() { this.submitForm(); }
  sendSuccess() { return this.sent() ? (this.isArabic() ? 'تم حفظ رسالتك بنجاح.' : 'Message received successfully.') : ''; }
  contactStatus() { return this.sendSuccess(); }
  contactError() { return this.sendErrorMessage(); }
  contactBusy() { return this.sending(); }

  openProject(project: Project) { this.selectedProject.set(project); }
  closeProject() { this.selectedProject.set(null); }
  scrollToContact() { document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }

  openAdmin() { if (!this.isAdmin()) return; this.adminOpen.set(true); this.loadAdminDashboard(); }
  closeAdmin() { this.adminOpen.set(false); }

  loadAdminDashboard() {
    const token = localStorage.getItem('webdev_token');
    if (!token) return;
    this.adminLoading.set(true);
    this.adminError.set('');
    this.adminProjects.set(this.projects);
    this.http.get<{ stats: { customers: number; messages: number; unreadMessages: number }; customers: DashboardCustomer[]; messages: DashboardMessage[] }>(`${this.apiUrl}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: data => {
        this.adminStats.set(data.stats);
        this.adminCustomers.set(data.customers);
        this.adminMessages.set(data.messages);
        this.adminLoading.set(false);
      },
      error: error => {
        this.adminLoading.set(false);
        this.adminError.set(error?.error?.message || 'Unable to load admin data.');
      }
    });
  }

  deleteProject(id: string | undefined) {
    if (!id) return;
    this.adminProjects.update(projects => projects.filter(project => project.id !== id));
  }

  markMessageRead(id: string) {
    const token = localStorage.getItem('webdev_token');
    if (!token) return;
    this.http.patch<DashboardMessage>(`${this.apiUrl}/admin/messages/${id}`, { status: 'read' }, { headers: { Authorization: `Bearer ${token}` } }).subscribe({ next: () => this.loadAdminDashboard() });
  }
}
