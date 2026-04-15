"use client";

import Nav from "@/components/Nav";
import HomePage from "@/components/HomePage";
import ProjectsPage from "@/components/ProjectsPage";
import AboutPage from "@/components/AboutPage";
import SmoothScroll from "@/components/SmoothScroll";

export type SectionId = "home" | "projects" | "about";

export default function Home() {
  return (
    <SmoothScroll>
      <main>
        <Nav />
        <HomePage />
        <ProjectsPage />
        <AboutPage />
      </main>
    </SmoothScroll>
  );
}
