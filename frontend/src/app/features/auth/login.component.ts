import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountRole, UserProfile } from './auth.service';
import { SignInDialogComponent } from './sign-in-dialog.component';

@Component({ selector: 'app-login', standalone: true, imports: [SignInDialogComponent], template: `
  <main class="login-page"><a class="brand" href="/" aria-label="Return to LibTrack home"><span aria-hidden="true">▤</span>LibTrack</a>
    <p class="muted">Sign in with the email and password assigned to your library account.</p>
    <app-sign-in-dialog [initialRole]="initialRole" (dismissed)="returnHome()" (authenticated)="openWorkspace($event)" />
  </main>
`, styles: [`:host{display:block;min-height:100vh}.login-page{display:grid;min-height:100vh;align-content:center;justify-items:center;gap:.6rem;padding:2rem;background:var(--color-ivory-50)}.brand{display:flex;align-items:center;gap:.5rem;color:var(--color-forest-950);font:600 1.5rem var(--font-serif);text-decoration:none}.brand span{display:grid;width:2.4rem;height:2.4rem;place-items:center;border-radius:5px;color:white;background:var(--color-forest-900)}.login-page>p{margin:0;text-align:center}`] })
export class LoginComponent {
  private readonly router=inject(Router);
  private readonly route=inject(ActivatedRoute);
  get initialRole(): AccountRole {
    const role=this.route.snapshot.queryParamMap.get('role');
    return role==='FACULTY'||role==='LIBRARIAN' ? role : 'STUDENT';
  }
  openWorkspace(_profile:UserProfile):void { void this.router.navigateByUrl('/workspace'); }
  returnHome():void { void this.router.navigateByUrl('/'); }
}