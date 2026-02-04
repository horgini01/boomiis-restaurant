import { Heart, Leaf, Users, Award } from 'lucide-react';
import Header from '@/components/Header';

export function About() {
  const values = [
    {
      icon: Heart,
      title: 'Authentic Flavors',
      description: 'We bring the true taste of West Africa to your table, using traditional recipes passed down through generations.',
    },
    {
      icon: Leaf,
      title: 'Fresh Ingredients',
      description: 'We source the finest ingredients, working with local suppliers and importing authentic spices directly from West Africa.',
    },
    {
      icon: Users,
      title: 'Community Focus',
      description: 'More than a restaurant, we are a gathering place for our community to celebrate culture, food, and togetherness.',
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Our commitment to quality and service has earned us recognition as one of the top African restaurants in the region.',
    },
  ];

  const team = [
    {
      name: 'Chef Emmanuel Adebayo',
      role: 'Head Chef & Founder',
      image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&q=80',
      bio: 'With over 20 years of culinary experience, Chef Emmanuel brings authentic West African flavors to life.',
    },
    {
      name: 'Amara Okafor',
      role: 'Restaurant Manager',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
      bio: 'Amara ensures every guest feels welcome and enjoys an exceptional dining experience.',
    },
    {
      name: 'Kwame Mensah',
      role: 'Sous Chef',
      image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop&q=80',
      bio: 'Kwame specializes in traditional Ghanaian cuisine and brings creativity to our seasonal specials.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <div className="bg-black text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Our Story</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Bringing the vibrant flavors and warm hospitality of West Africa to your neighborhood since 2015
          </p>
        </div>
      </div>

      {/* Story Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">A Taste of Home</h2>
          <div className="space-y-4 text-lg text-muted-foreground">
            <p>
              Boomiis was born from a simple dream: to share the rich culinary heritage of West Africa with our
              community. What started as a small family kitchen has grown into a beloved restaurant where authentic
              flavors meet warm hospitality.
            </p>
            <p>
              Our founder, Chef Emmanuel Adebayo, grew up in Lagos, Nigeria, where food was more than sustenance—it
              was a celebration of life, family, and culture. After moving to the UK, he noticed a gap: while African
              cuisine was gaining recognition, few places offered the authentic, home-cooked flavors he remembered
              from his childhood.
            </p>
            <p>
              In 2015, Chef Emmanuel opened Boomiis with a mission to bring those authentic tastes to life. Every dish
              on our menu tells a story—from the perfectly spiced Jollof Rice to the rich, aromatic Egusi Soup. We
              source traditional ingredients, honor time-tested cooking methods, and infuse every meal with the love
              and care that defines West African hospitality.
            </p>
            <p>
              Today, Boomiis is more than a restaurant. It's a gathering place where families celebrate, friends
              reconnect, and newcomers discover the vibrant flavors of West Africa for the first time. We're proud to
              serve our community and share our culture, one delicious meal at a time.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500 text-white mb-4">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {team.map((member) => (
            <div key={member.name} className="text-center">
              <img
                src={member.image}
                alt={member.name}
                className="w-48 h-48 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
              <p className="text-orange-500 font-medium mb-3">{member.role}</p>
              <p className="text-muted-foreground">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Awards Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Recognition & Awards</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-start gap-4">
              <Award className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Best African Restaurant 2023</h3>
                <p className="text-muted-foreground">Local Food Awards</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Award className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Certificate of Excellence</h3>
                <p className="text-muted-foreground">TripAdvisor - 2022, 2023, 2024</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Award className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Featured in "Hidden Gems of UK Dining"</h3>
                <p className="text-muted-foreground">The Guardian - 2023</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
