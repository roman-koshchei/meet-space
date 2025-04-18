<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Video,
		Users,
		Calendar,
		MessageSquare,
		ChevronRight,
		Star,
		Shield,
		Zap
	} from 'lucide-svelte';
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
						{#if index === 0}
							<span class="text-purple-500">{word}&nbsp;</span>
						{:else}
							<span class="text-blue-500">{word}&nbsp;</span>
						{/if}
					</div>
				{/each}
			</h1>

			<p class="motion-preset-focus-sm motion-delay-[0.8s] mt-6 max-w-md text-xl text-slate-600">
				The modern platform for seamless virtual meetings, collaborative workspaces, and efficient
				team communication.
			</p>

			<div class="motion-preset-focus-sm motion-delay-[1s] mt-8 flex gap-4">
				<Button
					size="lg"
					class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
				>
					<span>Get Started</span>
					<ChevronRight class="ml-2 h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="lg"
					class="border-purple-300 text-purple-700 hover:bg-purple-50">Take a Tour</Button
				>
			</div>

			<!-- Stats Section -->
			<div class="motion-preset-focus-sm motion-delay-[1.1s] mt-10 grid grid-cols-3 gap-4">
				<div class="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-3 text-center">
					<div class="mb-1 flex justify-center">
						<Users class="h-6 w-6 text-purple-600" />
					</div>
					<p class="text-2xl font-bold text-purple-700">10K+</p>
					<p class="text-xs text-purple-600">Active Users</p>
				</div>
				<div class="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-3 text-center">
					<div class="mb-1 flex justify-center">
						<Video class="h-6 w-6 text-blue-600" />
					</div>
					<p class="text-2xl font-bold text-blue-700">50K+</p>
					<p class="text-xs text-blue-600">Meetings</p>
				</div>
				<div class="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-3 text-center">
					<div class="mb-1 flex justify-center">
						<MessageSquare class="h-6 w-6 text-purple-600" />
					</div>
					<p class="text-2xl font-bold text-purple-700">99%</p>
					<p class="text-xs text-purple-600">Satisfaction</p>
				</div>
			</div>

			<!-- Features Section -->
			<div class="motion-preset-focus-sm motion-delay-[1.2s] mt-8">
				<p class="mb-3 text-sm font-semibold text-purple-600">KEY FEATURES</p>
				<div class="grid grid-cols-2 gap-3">
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
							<Calendar class="h-4 w-4 text-blue-600" />
						</div>
						<span class="text-sm text-slate-700">Smart Scheduling</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
							<Shield class="h-4 w-4 text-purple-600" />
						</div>
						<span class="text-sm text-slate-700">End-to-End Encryption</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
							<Zap class="h-4 w-4 text-blue-600" />
						</div>
						<span class="text-sm text-slate-700">AI-Powered Notes</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
							<Star class="h-4 w-4 text-purple-600" />
						</div>
						<span class="text-sm text-slate-700">Seamless Integration</span>
					</div>
				</div>
			</div>

			<div class="motion-preset-focus-sm motion-delay-[1.3s] mt-10 flex items-center gap-6">
				<div class="flex -space-x-4">
					{#each Array(4) as _, i}
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br {i %
								2 ===
							0
								? 'from-purple-200 to-purple-300 text-purple-700'
								: 'from-blue-200 to-blue-300 text-blue-700'} text-xs font-bold"
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
					class="absolute -top-24 -left-24 size-100 rounded-full bg-purple-200 opacity-70 blur-xl"
				></div>
				<div
					class="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-blue-200 opacity-70 blur-xl"
				></div>
				<div
					class="absolute top-20 -right-16 h-24 w-24 rounded-full bg-purple-200 opacity-70 blur-xl"
				></div>
				<div class="relative rounded-xl bg-gradient-to-tr from-slate-50 to-slate-100 p-6 shadow-lg">
					<div
						class="mb-3 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-600"
					>
						Live now: Team Standup Meeting
					</div>
					<div class="aspect-video overflow-hidden rounded-lg bg-white shadow-sm">
						<div class="p-4">
							<div class="mb-6 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600"
									>
										MS
									</div>
									<div>
										<h3 class="font-semibold">Meet Space Call</h3>
										<p class="text-xs text-slate-500">Started 10 minutes ago</p>
									</div>
								</div>
								<div class="flex gap-2">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
										<Video class="h-4 w-4 text-slate-600" />
									</div>
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
										<Users class="h-4 w-4 text-slate-600" />
									</div>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-2">
								{#each Array(4) as _, i}
									<div
										class="aspect-video rounded-md bg-gradient-to-br {i % 2 === 0
											? 'from-purple-50 to-purple-100'
											: 'from-blue-50 to-blue-100'}"
									>
										<div class="flex h-full items-center justify-center">
											<div class="text-center">
												<div class="mb-1 flex justify-center">
													<div
														class="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 backdrop-blur-sm"
													>
														{['JD', 'SK', 'MP', 'AR'][i]}
													</div>
												</div>
												<p
													class="text-xs font-medium {i % 2 === 0
														? 'text-purple-700'
														: 'text-blue-700'}"
												>
													{['John Doe', 'Sarah Kim', 'Mike Peters', 'Ana Rivera'][i]}
												</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
							<div class="mt-6 flex justify-center gap-4">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600"
								>
									<Video class="h-5 w-5" />
								</div>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600"
								>
									<MessageSquare class="h-5 w-5" />
								</div>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600"
								>
									<Users class="h-5 w-5" />
								</div>
							</div>
						</div>
					</div>

					<div class="mt-4 flex items-center justify-between rounded-lg bg-blue-50 p-3">
						<div class="flex items-center gap-3">
							<Calendar class="h-5 w-5 text-blue-600" />
							<div>
								<p class="text-sm font-medium text-blue-900">Upcoming meeting</p>
								<p class="text-xs text-blue-700">Product Review @ 2:00 PM</p>
							</div>
						</div>
						<Button
							variant="outline"
							class="h-8 border-blue-300 px-3 text-xs text-blue-700 hover:bg-blue-100">Join</Button
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
