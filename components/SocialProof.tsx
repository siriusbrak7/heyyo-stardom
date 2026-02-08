import React from 'react';
import { Users, Download, Star, Award, Music, Headphones, Zap, TrendingUp } from 'lucide-react';

const SocialProof: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      name: "Marcus J.",
      role: "Independent Producer",
      content: "Curry Stardom's Pro plan changed my workflow. The WAV quality is unmatched, and I've already cleared 50k streams on my latest track.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
      rating: 5
    },
    {
      id: 2,
      name: "Elena Ray",
      role: "Vocalist / Songwriter",
      content: "The tempo adjuster on the homepage let me find the perfect vibe before I even signed up. The 'Exclusive' stems are a lifesaver for mixing!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
      rating: 5
    },
    {
      id: 3,
      name: "Alex Torres",
      role: "Music Producer",
      content: "As someone who produces for major labels, the stem quality here is industry standard. The licensing is clear and straightforward.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      rating: 5
    }
  ];

  const stats = [
    { icon: <Users className="w-6 h-6" />, value: "500+", label: "Active Producers" },
    { icon: <Download className="w-6 h-6" />, value: "10K+", label: "Downloads" },
    { icon: <Music className="w-6 h-6" />, value: "200+", label: "Premium Beats" },
    { icon: <Star className="w-6 h-6" />, value: "4.9/5", label: "User Rating" }
  ];

  const features = [
    { icon: <Zap className="w-5 h-5" />, text: "New beats added every Friday" },
    { icon: <Headphones className="w-5 h-5" />, text: "High-fidelity 24-bit WAV files" },
    { icon: <Award className="w-5 h-5" />, text: "Industry standard stems included" },
    { icon: <TrendingUp className="w-5 h-5" />, text: "Clear commercial rights" }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-gray-900/20 to-black">
      <div className="max-w-7xl mx-auto">
        {/* Stats Section */}
        <div className="glass rounded-3xl p-8 mb-16 backdrop-blur-sm">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-black italic mb-4">
              Trusted by <span className="text-yellow-500">Top Producers</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Join the community of professional producers who trust Curry Stardom for their beat needs
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center p-6 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <div className="text-yellow-500">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Testimonials */}
          <div>
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
              <Star className="w-6 h-6 text-yellow-500" />
              What Producers Are Saying
            </h3>
            
            <div className="space-y-6">
              {testimonials.map((testimonial) => (
                <div 
                  key={testimonial.id} 
                  className="glass rounded-2xl p-6 backdrop-blur-sm hover:scale-[1.02] transition-transform"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full border-2 border-yellow-500/20"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-lg">{testimonial.name}</h4>
                          <p className="text-sm text-gray-500">{testimonial.role}</p>
                        </div>
                        <div className="flex">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 italic">"{testimonial.content}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features & Trust Signals */}
          <div>
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
              <Award className="w-6 h-6 text-yellow-500" />
              Why Choose Curry Stardom
            </h3>
            
            <div className="glass rounded-2xl p-6 backdrop-blur-sm mb-8">
              <h4 className="font-bold text-lg mb-4">Premium Features</h4>
              <div className="space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg flex items-center justify-center">
                      <div className="text-yellow-500">
                        {feature.icon}
                      </div>
                    </div>
                    <span className="font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="glass rounded-2xl p-6 backdrop-blur-sm">
              <h4 className="font-bold text-lg mb-4">Secure & Reliable</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-green-500 mb-1">256-bit</div>
                  <div className="text-xs text-gray-400">SSL Encryption</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-blue-500 mb-1">24/7</div>
                  <div className="text-xs text-gray-400">Support</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-purple-500 mb-1">100%</div>
                  <div className="text-xs text-gray-400">Legal Rights</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-yellow-500 mb-1">30-Day</div>
                  <div className="text-xs text-gray-400">Money Back</div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-8 p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/20">
              <h4 className="font-bold text-lg mb-2">Ready to Elevate Your Sound?</h4>
              <p className="text-sm text-gray-400 mb-4">
                Join hundreds of producers who trust Curry Stardom for professional-grade beats
              </p>
              <a 
                href="#plans"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                View Plans & Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;