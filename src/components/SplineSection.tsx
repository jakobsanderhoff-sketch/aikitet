'use client'

import { SplineScene } from "@/components/ui/spline";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function SplineSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    const yText = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const ySpline = useTransform(scrollYProgress, [0, 1], [0, -50]);
    const yHue = useTransform(scrollYProgress, [0, 1], [200, -200]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

    return (
        <section ref={sectionRef} className="w-full relative min-h-[600px] flex items-center justify-center py-24 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
            {/* Directed Beam Background - Sharp Oval, 45deg, pointing at Levi */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div style={{ y: yHue }} className="absolute -top-[10%] -left-[5%] w-[500px] h-[1000px] rotate-[45deg] opacity-50 blur-[60px] mix-blend-screen bg-gradient-to-b from-white via-zinc-400 to-transparent rounded-[100%] pointer-events-none" />
            </div>

            {/* Manual Fade Overlays to ensure seamless blend */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-0" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-0" />
            <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-black to-transparent z-0" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-12">
                    {/* Left content with Parallax */}
                    <motion.div
                        style={{ y: yText, opacity }}
                        className="flex-1 flex flex-col justify-center text-center md:text-left"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 mb-6">
                            Meet Levi.
                        </h1>
                        <p className="text-zinc-400 text-xl md:text-2xl leading-relaxed max-w-xl mx-auto md:mx-0">
                            Levi is a digital architect built on knowledge, local laws, and lots of blueprints. He reads thousands of architectural patterns to ensure your floor plans are not just beautiful, but structurally accurate.
                        </p>
                    </motion.div>

                    {/* Right content with different Parallax speed */}
                    <motion.div
                        style={{ y: ySpline, opacity }}
                        className="flex-1 w-full h-[500px] relative"
                    >
                        <SplineScene
                            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                            className="w-full h-full"
                        />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
