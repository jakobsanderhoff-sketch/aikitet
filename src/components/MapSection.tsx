'use client'

import React, { useState, useRef } from 'react';
import Image from "next/image";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function MapSection() {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <section
            className="relative w-full h-[600px] bg-black overflow-hidden flex items-center justify-center group"
            onMouseMove={handleMouseMove}
        >
            {/* Background Map - Dimmed by default */}
            <div className="absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30">
                <Image
                    src="/images/cph-background-new.jpg"
                    alt="Copenhagen Background"
                    fill
                    className="object-cover"
                />
            </div>

            {/* Flashlight Reveal Effect */}
            <motion.div
                className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                        650px circle at ${mouseX}px ${mouseY}px,
                        rgba(255, 255, 255, 0.1),
                        transparent 80%
                        )
                    `,
                }}
            >
                {/* This second image layer is "revealed" by the gradient mask if we wanted to do that, 
                     but here we are just casting a light. 
                     Let's try a different approach: The map itself is visible, but the light adds 'clarity'.
                  */}
            </motion.div>

            {/* Heavy Vignette to focus center */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] Pointer-events-none" />

            {/* Content Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-8 drop-shadow-2xl">
                        Born in Copenhagen.
                    </h2>

                    <div className="max-w-2xl mx-auto space-y-6">
                        <p className="text-xl md:text-2xl text-neutral-400 font-light leading-relaxed">
                            We are currently located in <span className="text-white font-medium">Copenhagen</span>,
                            focusing deeply on local rules and Danish building regulations.
                        </p>

                        <p className="text-sm md:text-base text-neutral-500 uppercase tracking-widest mt-12">
                            Expanding Global 2026
                        </p>
                    </div>

                    {/* Animated Pulse Pin */}
                    <div className="mt-12 flex justify-center">
                        <div className="relative flex h-6 w-6">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-6 w-6 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"></span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
