<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<div class="container mx-auto py-10">
	<div class="grid min-h-[calc(100vh-5rem)] grid-cols-1 items-center gap-8 md:grid-cols-2">
		<!-- Hero Content -->
		<div class="flex flex-col text-left">
			<h1 class=" flex flex-wrap text-5xl leading-18 font-bold md:text-6xl">
				{#each 'Welcome to'.split(' ') as word, index}
					<div
						style={`--delay: ${index * 0.05 + 0.2}s`}
						class="motion-delay-[var(--delay)] motion-ease-in-out-quad motion-opacity-in-0 motion-blur-in-sm motion-translate-y-in-25 inline-flex"
					>
						{word}&nbsp;
					</div>
				{/each}
				{#each 'Meet Space'.split(' ') as word, index}
					<div
						style={`--delay: ${index * 0.05 + 0.25}s`}
						class="motion-delay-[var(--delay)] motion-ease-in-out-quad motion-opacity-in-0 motion-blur-in-sm motion-translate-y-in-25 inline-flex"
					>
						<span
							class="motion-delay-[var(--delay)] motion-ease-in-out-quad text-green-500"
							style={`--delay: ${index * 0.05 + 0.3}s`}
						>
							{word}&nbsp;
						</span>
					</div>
				{/each}
			</h1>

			<p class="motion-preset-focus-sm motion-delay-[0.8s] mt-6 max-w-md text-xl text-slate-600">
				The modern platform for seamless virtual meetings, collaborative workspaces, and efficient
				team communication.
			</p>

			<div class="motion-preset-focus-sm motion-delay-[1s] mt-8 flex gap-4">
				<Button size="lg">Get Started</Button>
				<Button variant="outline" size="lg">Take a Tour</Button>
			</div>

			<div class="motion-preset-focus-sm motion-delay-[1.2s] mt-12 flex items-center gap-6">
				<div class="flex -space-x-4">
					{#each Array(4) as _, i}
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-xs font-bold"
						>
							{['JD', 'SK', 'MP', 'AR'][i]}
						</div>
					{/each}
				</div>
				<p class="text-slate-600">Join 10,000+ teams already using Meet Space</p>
			</div>
		</div>

		<!-- Hero Image -->
		<div class="motion-preset-focus-sm motion-delay-[0.5s] hidden md:block">
			<div class="relative">
				<div
					class="absolute -top-24 -left-24 size-100 rounded-full bg-green-100 opacity-70 blur-xl"
				></div>
				<div
					class="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-blue-100 opacity-70 blur-xl"
				></div>
				<div class="relative rounded-xl bg-gradient-to-tr from-slate-50 to-slate-100 p-4 shadow-lg">
					<div class="aspect-video overflow-hidden rounded-lg bg-white shadow-sm">
						<div class="p-4">
							<div class="mb-6 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-600"
									>
										MS
									</div>
									<h3 class="font-semibold">Meet Space Call</h3>
								</div>
								<div class="flex gap-2">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
										<div class="h-4 w-4 rounded-full bg-slate-400"></div>
									</div>
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
										<div class="h-4 w-4 rounded-full bg-slate-400"></div>
									</div>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-2">
								{#each Array(4) as _}
									<div class="aspect-video rounded-md bg-slate-200"></div>
								{/each}
							</div>
							<div class="mt-6 flex justify-center gap-4">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"
								></div>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
								></div>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
