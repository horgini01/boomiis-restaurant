import { Heart, Leaf, Users, Award } from 'lucide-react';
import { SEO } from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

// Icon mapping for values
const iconMap: Record<string, any> = {
  Heart,
  Leaf,
  Users,
  Award,
};

export function About() {
  // Fetch dynamic content
  const { data: contentData = [], isLoading: loadingContent } = trpc.about.content.useQuery();
  const { data: valuesData = [], isLoading: loadingValues } = trpc.about.values.useQuery();
  const { data: teamData = [], isLoading: loadingTeam } = trpc.about.team.useQuery();
  const { data: awardsData = [], isLoading: loadingAwards } = trpc.about.awards.useQuery();

  // Helper to get content value
  const getContent = (key: string, fallback: string = '') => {
    const item = contentData.find((c: any) => c.sectionKey === key);
    return item?.sectionValue || fallback;
  };

  // Loading state
  if (loadingContent || loadingValues || loadingTeam || loadingAwards) {
    return (
      <>
        <SEO 
          title="About Us"
          description="Learn about Boomiis Restaurant's mission to bring authentic West African cuisine to London. Meet our team, discover our values, and explore our journey celebrating African culinary heritage."
          image="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=630&fit=crop"
          url="/about"
        />
        <div className="min-h-screen bg-background">
          <Header />
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
          <Footer />
      <WhatsAppButton />
        </div>
      </>
    );
  }

  // Filter active items and sort by display order
  const activeValues = valuesData.filter((v: any) => v.isActive).sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  const activeTeam = teamData.filter((t: any) => t.isActive).sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  const activeAwards = awardsData.filter((a: any) => a.isActive).sort((a: any, b: any) => a.displayOrder - b.displayOrder);

  return (
    <>
      <SEO 
        title="About Us"
        description="Learn about Boomiis Restaurant's mission to bring authentic West African cuisine to London. Meet our team, discover our values, and explore our journey celebrating African culinary heritage."
        image="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=630&fit=crop"
        url="/about"
      />
      <div className="min-h-screen bg-background">
        <Header />
      {/* Hero Section */}
      <div className="bg-black text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">
            {getContent('hero_title', 'Our Story')}
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {getContent('hero_tagline', 'Bringing the vibrant flavors and warm hospitality of West Africa to your neighborhood')}
          </p>
        </div>
      </div>

      {/* Story Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">A Taste of Home</h2>
          <div className="space-y-4 text-lg text-muted-foreground">
            {getContent('story_intro') && (
              <p>{getContent('story_intro')}</p>
            )}
            {getContent('story_paragraph1') && (
              <p>{getContent('story_paragraph1')}</p>
            )}
            {getContent('story_paragraph2') && (
              <p>{getContent('story_paragraph2')}</p>
            )}
            
            {/* Fallback content if no story is set */}
            {!getContent('story_intro') && !getContent('story_paragraph1') && !getContent('story_paragraph2') && (
              <>
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
                  Today, Boomiis is more than a restaurant. It's a gathering place where families celebrate, friends
                  reconnect, and newcomers discover the vibrant flavors of West Africa for the first time. We're proud to
                  serve our community and share our culture, one delicious meal at a time.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Values Section */}
      {activeValues.length > 0 && (
        <div className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {activeValues.map((value: any) => {
                const Icon = iconMap[value.icon] || Heart;
                return (
                  <div key={value.id} className="text-center">
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
      )}

      {/* Team Section */}
      {activeTeam.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {activeTeam.map((member: any) => (
              <div key={member.id} className="text-center">
                {member.imageUrl && (
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    className="w-48 h-48 rounded-full mx-auto mb-4 object-cover"
                  />
                )}
                {!member.imageUrl && (
                  <div className="w-48 h-48 rounded-full mx-auto mb-4 bg-muted flex items-center justify-center">
                    <Users className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-orange-500 font-medium mb-3">{member.title}</p>
                <p className="text-muted-foreground">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards Section */}
      {activeAwards.length > 0 && (
        <div className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Recognition & Awards</h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {activeAwards.map((award: any) => (
                <div key={award.id} className="flex items-start gap-4">
                  {award.imageUrl ? (
                    <img src={award.imageUrl} alt={award.title} className="w-16 h-16 object-contain flex-shrink-0" />
                  ) : (
                    <Award className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{award.title}</h3>
                    {award.description && (
                      <p className="text-muted-foreground">{award.description}</p>
                    )}
                    {award.year && (
                      <p className="text-sm text-muted-foreground mt-1">{award.year}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        <Footer />
      <WhatsAppButton />
      </div>
    </>
  );
}
