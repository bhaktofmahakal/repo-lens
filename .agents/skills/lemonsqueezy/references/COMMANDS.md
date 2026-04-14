# Command Reference

Full reference for all `lmsq` commands, options, and filters.

## auth

```bash
lmsq auth login [--key <api-key>]     # authenticate and save key (prompts if no --key)
lmsq auth logout                       # remove stored key
lmsq auth status                       # show key source, masked key, and user info
```

## user

```bash
lmsq user                              # show authenticated user profile
lmsq user --pluck email                # just the email
```

## stores

```bash
lmsq stores list [--include products,orders,subscriptions,discounts,license-keys,webhooks]
lmsq stores get <id> [--include ...]
```

## customers

```bash
lmsq customers list [--store-id <id>] [--email <email>] [--include store,orders,subscriptions,license-keys]
lmsq customers get <id> [--include ...]
lmsq customers create --store-id <id> --name <name> --email <email> [--city <city>] [--country <CC>] [--region <region>]
lmsq customers update <id> [--name <name>] [--email <email>] [--city <city>] [--country <CC>] [--region <region>]
lmsq customers archive <id>
```

## products

```bash
lmsq products list [--store-id <id>] [--include store,variants]
lmsq products get <id> [--include ...]
```

## variants

```bash
lmsq variants list [--product-id <id>] [--status <status>] [--include product,files,price-model]
lmsq variants get <id> [--include ...]
```

## prices

```bash
lmsq prices list [--variant-id <id>] [--include variant]
lmsq prices get <id> [--include ...]
```

## files

```bash
lmsq files list [--variant-id <id>] [--include variant]
lmsq files get <id> [--include ...]
```

## orders

```bash
lmsq orders list [--store-id <id>] [--user-email <email>] [--filter-order-number <num>] [--include store,customer,order-items,subscriptions,license-keys,discount-redemptions]
lmsq orders get <id> [--include ...]
lmsq orders invoice <id> [--name <n>] [--address <a>] [--city <c>] [--state <s>] [--zip-code <z>] [--country <CC>] [--notes <text>] [--locale <lang>]
lmsq orders refund <id> [--amount <cents>]   # omit --amount for full refund
```

## order-items

```bash
lmsq order-items list [--order-id <id>] [--product-id <id>] [--variant-id <id>] [--include order,product,variant]
lmsq order-items get <id> [--include ...]
```

## subscriptions

```bash
lmsq subscriptions list [--store-id <id>] [--order-id <id>] [--order-item-id <id>] [--product-id <id>] [--variant-id <id>] [--user-email <email>] [--status <status>] [--include store,customer,order,order-item,product,variant,subscription-items,subscription-invoices]
lmsq subscriptions get <id> [--include ...]
lmsq subscriptions update <id> [options]
lmsq subscriptions cancel <id>              # cancels immediately
```

### subscriptions update options

| Option | Description |
|--------|-------------|
| `--variant-id <id>` | Switch to a different plan |
| `--pause <mode>` | Pause: "void" (loses access) or "free" (keeps access) |
| `--pause-resumes-at <datetime>` | ISO 8601 auto-resume date |
| `--unpause` | Resume a paused subscription |
| `--cancelled` | Cancel at end of billing period |
| `--uncancelled` | Remove pending cancellation |
| `--trial-ends-at <datetime>` | Set trial end date |
| `--billing-anchor <day>` | Billing day of month (1-31, 0 to remove) |
| `--invoice-immediately` | Invoice now when changing plan |
| `--disable-prorations` | Skip proration when changing plan |

## subscription-invoices

```bash
lmsq subscription-invoices list [--store-id <id>] [--status <status>] [--refunded <bool>] [--subscription-id <id>] [--include store,subscription,customer]
lmsq subscription-invoices get <id> [--include ...]
lmsq subscription-invoices generate <id> [--name <n>] [--address <a>] [--city <c>] [--state <s>] [--zip-code <z>] [--country <CC>] [--notes <text>] [--locale <lang>]
lmsq subscription-invoices refund <id> [--amount <cents>]   # omit --amount for full refund
```

## subscription-items

```bash
lmsq subscription-items list [--subscription-id <id>] [--price-id <id>] [--include subscription,price,usage-records]
lmsq subscription-items get <id> [--include ...]
lmsq subscription-items update <id> --quantity <n> [--invoice-immediately <bool>] [--disable-prorations <bool>]
lmsq subscription-items usage <id>    # current usage in billing period
```

## usage-records

```bash
lmsq usage-records list [--subscription-item-id <id>] [--include subscription-item]
lmsq usage-records get <id> [--include ...]
lmsq usage-records create --subscription-item-id <id> --quantity <n> [--action increment|set]
```

## discounts

```bash
lmsq discounts list [--store-id <id>] [--include store,variants,discount-redemptions]
lmsq discounts get <id> [--include ...]
lmsq discounts create --store-id <id> --name <name> --amount <n> --amount-type percent|fixed [--code <code>] [--duration once|repeating|forever] [--duration-in-months <n>] [--is-limited-redemptions <bool>] [--max-redemptions <n>] [--starts-at <datetime>] [--expires-at <datetime>] [--is-limited-to-products <bool>] [--variant-ids <id,id>] [--test-mode <bool>]
lmsq discounts delete <id>
```

## discount-redemptions

```bash
lmsq discount-redemptions list [--discount-id <id>] [--order-id <id>] [--include discount,order]
lmsq discount-redemptions get <id> [--include ...]
```

## license-keys

```bash
lmsq license-keys list [--store-id <id>] [--order-id <id>] [--order-item-id <id>] [--product-id <id>] [--status <status>] [--include store,customer,order,order-item,product,license-key-instances]
lmsq license-keys get <id> [--include ...]
lmsq license-keys update <id> [--activation-limit <n|unlimited>] [--expires-at <datetime|never>] [--disabled <bool>] [--enabled <bool>]
```

## license-key-instances

```bash
lmsq license-key-instances list [--license-key-id <id>] [--include license-key]
lmsq license-key-instances get <id> [--include ...]
```

## checkouts

```bash
lmsq checkouts list [--store-id <id>] [--variant-id <id>] [--include store,variant]
lmsq checkouts get <id> [--include ...]
lmsq checkouts create --store-id <id> --variant-id <id> [options]
```

### checkouts create options

| Option | Description |
|--------|-------------|
| `--custom-price <cents>` | Override the variant price |
| `--email <email>` | Pre-fill customer email |
| `--name <name>` | Pre-fill customer name |
| `--discount-code <code>` | Pre-fill a discount code |
| `--redirect-url <url>` | Redirect after purchase |
| `--custom <json>` | Custom data as JSON string |
| `--test-mode` | Create in test mode |
| `--expires-at <datetime>` | Checkout expiration |
| `--no-logo` | Hide store logo |
| `--no-discount` | Hide discount code field |
| `--embed` | Show as overlay |
| `--button-color <hex>` | Custom button color |
| `--background-color <hex>` | Custom background color |
| `--product-name <name>` | Override product name |
| `--product-description <desc>` | Override product description |
| `--billing-country <CC>` | Pre-fill billing country |
| `--billing-zip <zip>` | Pre-fill billing zip |
| `--skip-trial` | Remove free trial |
| `--subscription-preview` | Show subscription preview text |
| `--preview` | Return pricing preview |

## webhooks

```bash
lmsq webhooks list [--store-id <id>] [--include store]
lmsq webhooks get <id> [--include ...]
lmsq webhooks create --store-id <id> --url <url> --secret <secret> --events <event,event> [--test-mode]
lmsq webhooks update <id> [--url <url>] [--secret <secret>] [--events <event,event>]
lmsq webhooks delete <id>
```

### Common webhook events

`order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_success`, `subscription_payment_failed`, `license_key_created`, `license_key_updated`

## affiliates

```bash
lmsq affiliates list [--store-id <id>] [--user-email <email>]
lmsq affiliates get <id>
```

## licenses (public API, no auth required)

```bash
lmsq licenses activate --key <license-key> --instance-name <name>
lmsq licenses validate --key <license-key> [--instance-id <id>]
lmsq licenses deactivate --key <license-key> --instance-id <id>
```
