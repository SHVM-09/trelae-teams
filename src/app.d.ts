// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session } from '@auth/core/types';

declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
        interface Locals {
            session: Session | null;
        }
        interface Session {
            user: {
                name?: string | null;
                email?: string | null;
                image?: string | null;
                id?: string;
            };
        }
    }
}

export {};