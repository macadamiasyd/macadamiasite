"use client";

import Nav from "@/components/Nav";
import HomePage from "@/components/HomePage";
import ProjectsPage from "@/components/ProjectsPage";
import AboutPage from "@/components/AboutPage";
import SmoothScroll from "@/components/SmoothScroll";
import Splash from "@/components/Splash";

export type SectionId = "home" | "projects" | "about";

export default function Home() {
  return (
    <>
      {/* 4-second logo intro that also warms up the homepage background
          videos in the HTTP cache before HomePage renders them. */}
      <Splash />
      <SmoothScroll>
        <main>
          <Nav />
          <HomePage />
          <ProjectsPage />
          <AboutPage />
        </main>
      </SmoothScroll>
    </>
  );
}
