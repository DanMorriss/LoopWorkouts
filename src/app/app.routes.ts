import { inject } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';
import { HistoryStore } from './shared/state/history-store.service';
import { welcomeFirst } from './welcome/welcome-first';

// Pages that read the history wait for it to load, so they don't show it empty at first
const historyLoaded: CanActivateFn = () => inject(HistoryStore).ready.then(() => true);

export const routes: Routes = [
    // The app opens on Home: the workouts due today, the workout to do next and the muscles worked this week
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    {
        path: 'home',
        // A device new to the app is welcomed first, to sign in or go on as a guest
        canActivate: [historyLoaded, welcomeFirst],
        loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    },
    {
        path: 'welcome',
        loadComponent: () => import('./welcome/welcome.component').then((m) => m.WelcomeComponent),
    },
    {
        // Asked once, after the welcome screen: your name, goal, equipment, body and units
        path: 'welcome/setup',
        loadComponent: () =>
            import('./welcome/setup/setup.component').then((m) => m.SetupComponent),
    },
    {
        path: 'setup',
        loadComponent: () =>
            import('./workout-setup/workout-setup.component').then((m) => m.WorkoutSetupComponent),
    },
    {
        path: 'library',
        loadComponent: () =>
            import('./workout-library/workout-library.component').then(
                (m) => m.WorkoutLibraryComponent
            ),
    },
    {
        path: 'ready-made',
        loadComponent: () =>
            import('./workout-library/ready-made/ready-made.component').then(
                (m) => m.ReadyMadeComponent
            ),
    },
    {
        path: 'plan',
        canActivate: [historyLoaded],
        loadComponent: () => import('./plan/plan.component').then((m) => m.PlanComponent),
    },
    {
        path: 'exercises',
        canActivate: [historyLoaded],
        loadComponent: () =>
            import('./exercises/exercise-list.component').then((m) => m.ExerciseListComponent),
    },
    {
        path: 'exercises/:id',
        canActivate: [historyLoaded],
        loadComponent: () =>
            import('./exercises/exercise-page/exercise-page.component').then(
                (m) => m.ExercisePageComponent
            ),
    },
    {
        path: 'history',
        canActivate: [historyLoaded],
        loadComponent: () => import('./history/history.component').then((m) => m.HistoryComponent),
    },
    {
        path: 'account',
        loadComponent: () => import('./account/account.component').then((m) => m.AccountComponent),
    },
    {
        path: 'settings',
        loadComponent: () =>
            import('./settings/settings.component').then((m) => m.SettingsComponent),
    },
    {
        path: 'privacy',
        loadComponent: () => import('./legal/privacy.component').then((m) => m.PrivacyComponent),
    },
    {
        path: 'terms',
        loadComponent: () => import('./legal/terms.component').then((m) => m.TermsComponent),
    },
    {
        path: 'workout',
        loadComponent: () => import('./workout/workout.component').then((m) => m.WorkoutComponent),
    },
    // The workout page was /timer until October 2026, so links and bookmarks to it still work
    { path: 'timer', redirectTo: 'workout' },
];
