<script>
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
</script>

<div class="container mx-auto py-10">
	<h1 class="mb-4 text-2xl font-bold">Welcome to SvelteKit with shadcn-ui</h1>
	<p class="mb-6">
		Visit <a href="https://svelte.dev/docs/kit" class="text-blue-500 underline"
			>svelte.dev/docs/kit</a
		> to read the documentation
	</p>

	<div class="mb-8 flex gap-4">
		<Button>Default Button</Button>
		<Button variant="outline">Outline</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="destructive">Destructive</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="link">Link</Button>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Login Form</CardTitle>
				<CardDescription>Enter your credentials to login</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4">
					<div class="grid gap-2">
						<label for="email">Email</label>
						<Input id="email" type="email" placeholder="email@example.com" />
					</div>
					<div class="grid gap-2">
						<label for="password">Password</label>
						<Input id="password" type="password" />
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button class="w-full">Login</Button>
			</CardFooter>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Newsletter</CardTitle>
				<CardDescription>Stay updated with our latest news</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4">
					<div class="grid gap-2">
						<label for="subscribe-email">Email</label>
						<Input id="subscribe-email" type="email" placeholder="email@example.com" />
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button class="w-full" variant="secondary">Subscribe</Button>
			</CardFooter>
		</Card>
	</div>
</div>
