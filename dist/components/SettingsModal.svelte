<script>import { Button } from "./ui/button/index.js";
import { Input } from "./ui/input/index.js";
import { Label } from "./ui/label/index.js";
import { X, RotateCcw } from "lucide-svelte";
import {
  explorer_uri,
  web_explorer_uri_tx,
  web_explorer_uri_addr,
  web_explorer_uri_tkn,
  SPAM_LIMIT
} from "../ergo/envs";
export let show = false;
const DEFAULTS = {
  api: "https://api.ergoplatform.com",
  tx: "https://sigmaspace.io/en/transaction/",
  addr: "https://sigmaspace.io/en/address/",
  tkn: "https://sigmaspace.io/en/token/",
  spam: "0"
};
function close() {
  show = false;
}
function restoreDefaults() {
  $explorer_uri = DEFAULTS.api;
  $web_explorer_uri_tx = DEFAULTS.tx;
  $web_explorer_uri_addr = DEFAULTS.addr;
  $web_explorer_uri_tkn = DEFAULTS.tkn;
  $SPAM_LIMIT = DEFAULTS.spam;
}
</script>

{#if show}
    <button class="modal-backdrop" on:click={close} aria-label="Close settings"
    ></button>

    <div class="modal" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold">Settings</h2>
            <Button variant="ghost" size="icon" on:click={close}>
                <X class="w-5 h-5" />
            </Button>
        </div>

        <div class="space-y-6">
            <div class="space-y-2">
                <Label for="explorer-api">Explorer API URI</Label>
                <div class="flex gap-2">
                    <Input
                        id="explorer-api"
                        bind:value={$explorer_uri}
                        placeholder={DEFAULTS.api}
                    />
                </div>
                <p class="text-xs text-muted-foreground">
                    The base URL for the Ergo Explorer API.
                </p>
            </div>

            <div class="space-y-2">
                <Label for="web-tx">Transaction Explorer URL</Label>
                <Input
                    id="web-tx"
                    bind:value={$web_explorer_uri_tx}
                    placeholder={DEFAULTS.tx}
                />
                <p class="text-xs text-muted-foreground">
                    URL prefix for viewing transactions.
                </p>
            </div>

            <div class="space-y-2">
                <Label for="web-addr">Address Explorer URL</Label>
                <Input
                    id="web-addr"
                    bind:value={$web_explorer_uri_addr}
                    placeholder={DEFAULTS.addr}
                />
                <p class="text-xs text-muted-foreground">
                    URL prefix for viewing addresses.
                </p>
            </div>

            <div class="space-y-2">
                <Label for="web-tkn">Token Explorer URL</Label>
                <Input
                    id="web-tkn"
                    bind:value={$web_explorer_uri_tkn}
                    placeholder={DEFAULTS.tkn}
                />
                <p class="text-xs text-muted-foreground">
                    URL prefix for viewing tokens.
                </p>
            </div>

            <div class="space-y-2">
                <Label for="spam-limit">Spam Limit</Label>
                <Input
                    id="spam-limit"
                    bind:value={$SPAM_LIMIT}
                    placeholder={DEFAULTS.spam}
                    type="number"
                />
                <p class="text-xs text-muted-foreground">
                    Minimum number of spam flags to hide a comment.
                </p>
            </div>
        </div>

        <div
            class="mt-8 flex justify-between items-center pt-4 border-t border-border"
        >
            <Button
                variant="outline"
                size="sm"
                on:click={restoreDefaults}
                class="text-muted-foreground hover:text-foreground"
            >
                <RotateCcw class="w-4 h-4 mr-2" />
                Restore Defaults
            </Button>

            <Button on:click={close}>Done</Button>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        /* Backdrop oscuro al 80% */
        position: fixed;
        inset: 0px;
        z-index: 70;
        cursor: default;
        background-color: rgb(0 0 0 / 0.8);
        --tw-backdrop-blur: blur(4px);
        backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);
    }

    .modal {
        /* - max-w-2xl: Más ancho.
           - bg-background: Color sólido del sistema (blanco en light, oscuro en dark) sin transparencia.
           - text-foreground: Color de texto correcto.
        */
        position: fixed;
        top: 50%;
        left: 50%;
        z-index: 80;
        width: 100%;
        max-width: 42rem;
        --tw-translate-x: -50%;
        --tw-translate-y: -50%;
        transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
        border-radius: 0.75rem;
        border-width: 1px;
        --tw-border-opacity: 1;
        border-color: hsl(var(--border) / var(--tw-border-opacity, 1));
        --tw-bg-opacity: 1;
        background-color: hsl(var(--background) / var(--tw-bg-opacity, 1));
        padding: 1.5rem;
        --tw-text-opacity: 1;
        color: hsl(var(--foreground) / var(--tw-text-opacity, 1));
        --tw-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
        --tw-shadow-colored: 0 25px 50px -12px var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }
</style>
