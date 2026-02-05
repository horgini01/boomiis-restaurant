import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// First, get the admin user ID
const [adminUser] = await connection.execute(
  `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
);

const authorId = adminUser[0]?.id || 1; // Fallback to ID 1 if no admin found

const blogPosts = [
  {
    title: "The Rich History of Jollof Rice: West Africa's Beloved Dish",
    slug: "history-of-jollof-rice",
    excerpt: "Discover the fascinating origins and cultural significance of Jollof Rice, the iconic one-pot dish that has sparked friendly debates across West Africa for generations.",
    content: `# The Rich History of Jollof Rice: West Africa's Beloved Dish

Jollof Rice is more than just a meal—it's a cultural phenomenon that unites and playfully divides West Africa. This vibrant, flavorful one-pot dish has become synonymous with celebration, family gatherings, and national pride across the region.

## Origins and Evolution

The dish traces its roots to the ancient Wolof Empire (modern-day Senegal and Gambia) in the 14th century, where it was known as "thieboudienne." As trade routes expanded and cultures mingled, the recipe evolved, with each nation adding its unique twist.

## The Great Jollof Debate

Ask any West African which country makes the best Jollof Rice, and you'll ignite a passionate discussion! Nigeria, Ghana, Senegal, and other nations each claim superiority, with subtle differences in preparation methods, spice blends, and accompanying proteins.

### Nigerian Jollof
Known for its smoky flavor achieved through the "party rice" technique, where the rice develops a slightly charred bottom layer called "socarrat."

### Ghanaian Jollof
Characterized by its use of aromatic spices and often cooked with a generous amount of tomatoes, giving it a rich, deep red color.

### Senegalese Jollof (Thieboudienne)
The original version, typically prepared with fish and vegetables, showcasing the dish's coastal heritage.

## Key Ingredients

While recipes vary, authentic Jollof Rice always includes:
- Long-grain parboiled rice
- Tomato paste and fresh tomatoes
- Onions and bell peppers
- Scotch bonnet peppers for heat
- Stock (chicken, beef, or fish)
- West African spices (thyme, curry powder, bay leaves)

## Cultural Significance

Jollof Rice is the centerpiece of celebrations—weddings, birthdays, holidays, and family reunions. The quality of Jollof served at an event can make or break its reputation! It's a dish that brings people together, sparking joy, nostalgia, and friendly competition.

## Experience Authentic Jollof at Boomiis

At Boomiis, we honor this beloved tradition by preparing our Jollof Rice using time-tested techniques passed down through generations. Our chefs have perfected the balance of spices, achieving that coveted smoky flavor while maintaining the perfect texture—each grain separate yet infused with rich, aromatic goodness.

Visit us to taste why Jollof Rice has captured hearts across West Africa and beyond. Whether you're team Nigeria, Ghana, or simply a lover of exceptional food, our Jollof Rice promises an authentic culinary journey.

*Book your table today and experience the magic of West African cuisine!*`,
    published_at: new Date('2024-01-15'),
    is_published: true,
    featured_image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1200&h=630&fit=crop"
  },
  {
    title: "5 Essential Spices in West African Cooking",
    slug: "essential-west-african-spices",
    excerpt: "Unlock the secrets of West African cuisine by mastering these five fundamental spices that bring depth, warmth, and complexity to every dish.",
    content: `# 5 Essential Spices in West African Cooking

West African cuisine is renowned for its bold, complex flavors—a symphony of tastes achieved through masterful spice blending. Whether you're cooking at home or dining at Boomiis, understanding these essential spices will deepen your appreciation for our culinary heritage.

## 1. Scotch Bonnet Peppers

**Heat Level:** Very Hot (100,000-350,000 Scoville units)

The crown jewel of West African spices, Scotch bonnet peppers deliver intense heat balanced with fruity, slightly sweet undertones. Unlike their cousin the habanero, Scotch bonnets have a distinct flavor that's irreplaceable in authentic dishes.

**Used in:** Jollof Rice, Pepper Soup, Suya marinade, stews

**Pro Tip:** Remove the seeds and membranes to reduce heat while retaining flavor. Always handle with care and wash hands thoroughly after use!

## 2. Ground Crayfish (Dried Shrimp)

**Flavor Profile:** Umami-rich, savory, slightly smoky

Ground crayfish isn't technically a spice, but it's an essential seasoning that adds incredible depth and umami to West African dishes. Made from dried, ground freshwater crayfish or shrimp, it's the secret ingredient that makes soups and stews irresistibly savory.

**Used in:** Egusi Soup, Okra Soup, Jollof Rice, Fried Rice

**Pro Tip:** Toast lightly in a dry pan before grinding to intensify the flavor.

## 3. Uziza Seeds (Piper guineense)

**Flavor Profile:** Peppery, slightly bitter, aromatic

Also known as West African black pepper or Guinea pepper, uziza seeds provide a unique peppery heat with hints of nutmeg and clove. The leaves are also used fresh in soups and stews.

**Used in:** Pepper Soup, Goat Meat Pepper Soup, Ofe Nsala

**Pro Tip:** Grind fresh for maximum potency—pre-ground uziza loses its aromatic oils quickly.

## 4. Cameroon Pepper (Pebe)

**Heat Level:** Medium to Hot

This sun-dried and smoked pepper brings both heat and a distinctive smoky flavor to dishes. It's often ground into a fine powder and used as a finishing spice or incorporated during cooking.

**Used in:** Suya spice blend, grilled meats, stews, sauces

**Pro Tip:** Combine with ground peanuts, ginger, and garlic to create an authentic Suya spice rub.

## 5. Curry Powder (West African Blend)

**Flavor Profile:** Warm, earthy, slightly sweet

While curry powder originated in India, West African cuisine has adopted and adapted it into a signature ingredient. The West African version often includes turmeric, coriander, cumin, fenugreek, and sometimes ginger, creating a unique flavor profile distinct from other regional blends.

**Used in:** Jollof Rice, Fried Rice, Chicken stew, Fish dishes

**Pro Tip:** Bloom curry powder in hot oil before adding other ingredients to unlock its full aromatic potential.

## Building Your Spice Pantry

To recreate authentic West African flavors at home, start with these five essentials. Store them in airtight containers away from light and heat to preserve their potency. Remember, freshness matters—whole spices ground just before use deliver superior flavor.

## Experience the Difference at Boomiis

At Boomiis, we source premium spices and grind many of them fresh daily to ensure every dish bursts with authentic West African flavor. Our chefs have mastered the art of spice balancing, creating dishes that honor tradition while delighting modern palates.

Ready to embark on a flavor journey? Visit Boomiis and taste the difference that quality spices and expert preparation make.

*Reserve your table today and let us introduce you to the vibrant world of West African cuisine!*`,
    published_at: new Date('2024-02-01'),
    is_published: true,
    featured_image: "https://images.unsplash.com/photo-1596040033229-a0b13b1b8e4f?w=1200&h=630&fit=crop"
  },
  {
    title: "How to Make Authentic Egusi Soup at Home",
    slug: "how-to-make-egusi-soup",
    excerpt: "Learn the secrets to preparing Egusi Soup, one of West Africa's most beloved dishes, with this step-by-step guide from our head chef.",
    content: `# How to Make Authentic Egusi Soup at Home

Egusi Soup is a rich, hearty Nigerian delicacy made from ground melon seeds. Its creamy texture, robust flavor, and nutritional value make it a staple in West African households. Today, we're sharing our restaurant-quality recipe so you can recreate this beloved dish at home.

## What is Egusi?

Egusi refers to the seeds of certain cucurbitaceous plants (melon family). When ground, these seeds create a nutty, protein-rich base that thickens and flavors the soup. The result is a luxurious, satisfying dish that pairs perfectly with pounded yam, fufu, or rice.

## Ingredients (Serves 6-8)

### Main Ingredients:
- 2 cups ground egusi (melon seeds)
- 500g assorted meat (beef, goat, or chicken)
- 200g stockfish (optional but recommended)
- 200g dried fish
- 1/2 cup palm oil
- 2-3 cups meat/chicken stock
- 2-3 Scotch bonnet peppers (adjust to taste)
- 1 large onion, chopped
- 4-6 cloves garlic, minced
- 2 tablespoons ground crayfish
- 2 stock cubes (Maggi or Knorr)
- Salt to taste

### Vegetables:
- 2 cups chopped spinach or bitter leaf
- 1 cup pumpkin leaves (ugu) - optional

## Step-by-Step Instructions

### Step 1: Prepare Your Proteins

1. **Season the meat** with salt, stock cubes, onions, and garlic
2. **Cook until tender** (about 30-40 minutes for beef/goat, 20 minutes for chicken)
3. **Soak stockfish and dried fish** in hot water for 10 minutes, then clean and debone
4. **Add to the meat** and cook for an additional 10 minutes
5. **Reserve the stock**—you'll need it for the soup

### Step 2: Prepare the Egusi Base

1. **Heat palm oil** in a large pot over medium heat
2. **Add chopped onions** and sauté until translucent
3. **Add ground egusi** and stir continuously for 3-5 minutes
   - The egusi should become fragrant and slightly golden
   - This step is crucial—it removes the raw taste and enhances the nutty flavor

### Step 3: Build the Soup

1. **Gradually add stock** (about 1 cup at a time), stirring to prevent lumps
2. **Add blended peppers** and ground crayfish
3. **Season with stock cubes** and salt
4. **Add the cooked meat, stockfish, and dried fish**
5. **Simmer for 15-20 minutes**, stirring occasionally
   - The soup should thicken to a creamy consistency
   - Add more stock if it becomes too thick

### Step 4: Add the Greens

1. **Wash and chop your vegetables**
2. **Add to the soup** and stir gently
3. **Cook for 3-5 minutes**—just until the greens wilt
   - Don't overcook! You want to retain the vibrant color and nutrients

### Step 5: Final Adjustments

1. **Taste and adjust seasoning**
2. **Check consistency**—add stock if too thick, simmer longer if too thin
3. **Let rest for 5 minutes** before serving

## Pro Tips from Our Kitchen

1. **Toast the egusi lightly** before adding liquid for deeper flavor
2. **Don't rush the cooking process**—low and slow develops the best taste
3. **Use a combination of proteins** for complexity
4. **Add vegetables last** to preserve their texture and color
5. **Make it ahead**—Egusi Soup tastes even better the next day!

## Serving Suggestions

Egusi Soup is traditionally served with:
- **Pounded Yam** (the classic pairing)
- **Fufu** (cassava, plantain, or semolina)
- **Eba** (garri)
- **White Rice**
- **Boiled Yam or Plantains**

## Variations

- **Egusi with Bitter Leaf:** Use bitter leaf for a more traditional, slightly bitter flavor
- **Lumpy Egusi:** Form the ground egusi into small balls before adding to the soup
- **Seafood Egusi:** Substitute or add shrimp, crab, or periwinkles

## Common Mistakes to Avoid

1. **Adding egusi to boiling liquid**—this causes lumps
2. **Overcooking the vegetables**—they should be vibrant, not mushy
3. **Using too little palm oil**—it's essential for authentic flavor
4. **Skipping the toasting step**—raw egusi has an unpleasant taste

## Experience Egusi Soup at Boomiis

While making Egusi Soup at home is rewarding, nothing compares to the version prepared by our expert chefs using generations-old techniques and the finest ingredients. We source authentic Nigerian egusi seeds and blend our spices in-house for unmatched flavor.

Visit Boomiis to taste the difference that experience and passion make. Our Egusi Soup is a customer favorite, served with your choice of swallow and garnished to perfection.

*Ready to experience authentic West African cuisine? Book your table today!*`,
    published_at: new Date('2024-02-15'),
    is_published: true,
    featured_image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=630&fit=crop"
  },
  {
    title: "Celebrating African Heritage Month at Boomiis",
    slug: "african-heritage-month-celebration",
    excerpt: "Join us this October as we celebrate African Heritage Month with special menu items, live music, and cultural events that honor our rich West African traditions.",
    content: `# Celebrating African Heritage Month at Boomiis

October is African Heritage Month in the UK, and at Boomiis, we're pulling out all the stops to celebrate the vibrant cultures, rich histories, and incredible contributions of the African diaspora. Join us for a month-long celebration featuring special dishes, live entertainment, and community events.

## Special Heritage Menu

Throughout October, we're featuring exclusive dishes that showcase the diversity of West African cuisine:

### Week 1: Nigerian Classics
- **Ofe Nsala (White Soup):** A delicate, aromatic soup from the Igbo people
- **Nkwobi:** Spicy cow foot delicacy in a rich palm oil sauce
- **Abacha (African Salad):** Refreshing cassava-based salad with garden eggs

### Week 2: Ghanaian Favorites
- **Red Red:** Black-eyed peas in rich tomato sauce with fried plantains
- **Banku with Okro Stew:** Fermented corn and cassava dough with okra soup
- **Kelewele:** Spicy fried plantain cubes—a beloved street food

### Week 3: Senegalese Delights
- **Thieboudienne:** The original Jollof—fish and rice cooked to perfection
- **Yassa Poulet:** Chicken marinated in lemon and onions
- **Mafe:** Peanut butter stew with tender meat and vegetables

### Week 4: Pan-African Fusion
- **Suya-Spiced Lamb Chops:** Our signature twist on a Nigerian classic
- **Jollof Paella:** East meets West in this creative fusion
- **Plantain and Egusi Arancini:** Traditional flavors in a modern format

## Live Entertainment Schedule

### Friday, October 6th - Opening Night Celebration
**7:00 PM - 11:00 PM**
- Live Afrobeats performance by DJ Kojo
- Traditional dance showcase
- Complimentary welcome cocktail for all guests
- *Reservations required*

### Saturday, October 14th - Drum Circle & Storytelling
**3:00 PM - 6:00 PM**
- Interactive West African drumming workshop
- Storytelling session featuring folktales from across the continent
- Family-friendly event
- *Free entry, food and drinks available for purchase*

### Friday, October 20th - Afrobeats Night
**8:00 PM - 1:00 AM**
- Live DJ spinning the hottest Afrobeats, Highlife, and Dancehall
- Special cocktail menu inspired by African flavors
- Late-night menu available
- *£10 cover charge after 9:00 PM*

### Sunday, October 29th - Heritage Brunch & Fashion Show
**11:00 AM - 3:00 PM**
- Special brunch menu featuring breakfast favorites with West African twists
- African fashion showcase featuring local designers
- Live acoustic performance
- *Reservations strongly recommended*

## Community Partnerships

We're proud to partner with local African cultural organizations to make this celebration truly special:

- **African Community Centre of London:** Hosting a cultural exhibition in our dining room featuring art, textiles, and historical artifacts
- **West African Women's Association:** Collaborating on a special charity dinner with proceeds supporting education initiatives in West Africa
- **Afro-Caribbean Music Society:** Curating our live music lineup

## Special Offers

### Heritage Month Discount
- **15% off** for groups of 6 or more
- **Complimentary appetizer** with any entrée purchase on Mondays and Tuesdays
- **Kids eat free** on Sundays (one child meal per adult entrée)

### Loyalty Program Launch
Join our new Boomiis Loyalty Program during October and receive:
- 100 bonus points upon signup
- Double points on all purchases in October
- Exclusive access to future special events

## Cooking Classes

Learn to cook authentic West African dishes with our head chef!

### Saturday, October 7th - Jollof Rice Masterclass
**2:00 PM - 5:00 PM | £45 per person**
Learn the secrets to perfect Jollof Rice, including the coveted "party rice" technique.

### Saturday, October 21st - Suya & Sides Workshop
**2:00 PM - 5:00 PM | £45 per person**
Master the art of Suya spice blending and grilling, plus learn to make traditional sides.

*Limited spots available—book now!*

## Takeaway & Catering

Can't make it to the restaurant? We've got you covered:
- **Heritage Month Meal Kits:** Pre-portioned ingredients and recipe cards for cooking at home
- **Party Platters:** Feed 10-15 people with our specially curated African Heritage platters
- **Corporate Catering:** Bring the celebration to your workplace with our catering services

## Why We Celebrate

African Heritage Month is more than a celebration—it's an opportunity to educate, honor, and share the richness of African cultures. At Boomiis, we're committed to preserving culinary traditions while creating a space where the African diaspora and food lovers of all backgrounds can come together.

Our restaurant was founded on the belief that food is a powerful connector—a way to share stories, preserve heritage, and build community. This October, we invite you to be part of that story.

## Book Your Experience

Don't miss this extraordinary month of flavors, culture, and community. Reservations are filling up fast, especially for our special events.

**Call us at +44 20 1234 5678 or book online at boomiis.uk/reservations**

We can't wait to celebrate with you!

*Boomiis—Where West African Heritage Meets Modern Dining*`,
    published_at: new Date('2024-09-25'),
    is_published: true,
    featured_image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=630&fit=crop"
  },
  {
    title: "The Art of Suya: Nigeria's Favorite Street Food",
    slug: "art-of-suya-nigerian-street-food",
    excerpt: "Explore the history, preparation, and irresistible appeal of Suya—Nigeria's beloved spicy grilled meat skewers that have captured hearts worldwide.",
    content: `# The Art of Suya: Nigeria's Favorite Street Food

As the sun sets across Nigerian cities, the smoky aroma of Suya fills the air, drawing crowds to street corners where skilled "Mai Suya" (Suya sellers) work their magic over open flames. This iconic street food has transcended its humble origins to become a cultural phenomenon—and at Boomiis, we're bringing this authentic experience to London.

## What is Suya?

Suya is thinly sliced meat (traditionally beef, but also chicken, ram, or fish) marinated in a complex spice blend called "yaji," then grilled over an open flame. The result is smoky, spicy, nutty, and utterly addictive—a perfect balance of flavors and textures that keeps people coming back for more.

## The History of Suya

Suya originated with the Hausa people of Northern Nigeria, where it was traditionally prepared by nomadic cattle herders. The spice blend and grilling technique were developed as a way to preserve and flavor meat in the hot Sahel climate.

As urbanization spread, Suya evolved from a practical preservation method to a beloved street food. Today, you'll find Suya spots (called "Suya joints") in every Nigerian neighborhood, from Lagos to Abuja, and increasingly in cities around the world.

## The Secret: Yaji Spice Blend

The soul of Suya lies in its spice blend—yaji (also called Suya pepper). While recipes vary by region and family tradition, authentic yaji typically includes:

- **Ground peanuts (kuli-kuli):** The base that gives Suya its distinctive nutty flavor
- **Ground ginger:** Adds warmth and depth
- **Garlic powder:** Provides savory notes
- **Onion powder:** Enhances umami
- **Cameroon pepper or cayenne:** Delivers heat
- **Paprika:** Contributes color and mild sweetness
- **Stock cubes:** Adds savory complexity
- **Salt:** Balances and enhances all flavors

The exact proportions are closely guarded secrets, passed down through generations. At Boomiis, our head chef spent years perfecting our yaji blend, achieving the ideal balance of heat, nuttiness, and aromatic spices.

## The Suya-Making Process

### 1. Meat Selection and Preparation
The best Suya starts with quality meat. Traditionally, beef is used—specifically cuts from the rump or sirloin that have some fat marbling for flavor and moisture. The meat is sliced very thin (about 1/4 inch) to allow for quick cooking and maximum spice penetration.

### 2. Marination
The meat is generously coated with yaji spice blend and sometimes a bit of oil to help the spices adhere. Some recipes include a brief marinade with onions and additional seasonings, but traditional Suya relies primarily on the dry spice rub.

### 3. Skewering
The meat is threaded onto metal skewers (traditionally thin metal rods), often alternating with sliced onions, bell peppers, or tomatoes.

### 4. Grilling
This is where the magic happens. Suya is grilled over an open charcoal flame, which imparts that essential smoky flavor. The Mai Suya constantly turns the skewers, basting with oil and additional yaji, until the meat develops a beautiful char while remaining juicy inside.

### 5. Serving
Hot off the grill, Suya is wrapped in newspaper (traditionally) or parchment paper, along with sliced onions, tomatoes, and cabbage. Extra yaji is sprinkled on top for those who like it extra spicy.

## How to Eat Suya

Suya is typically enjoyed as a snack or appetizer, but it's hearty enough to be a meal. Here's the traditional way to enjoy it:

1. **Unwrap carefully**—the meat is hot and the spices can be messy
2. **Slide the meat off the skewer** onto the paper or a plate
3. **Mix with the accompanying vegetables** and extra yaji
4. **Eat with your hands**—it's part of the experience!
5. **Have a cold drink ready**—Suya can be spicy!

### Perfect Pairings
- **Chapman (Nigerian cocktail):** A fruity, refreshing drink that balances the heat
- **Zobo (Hibiscus drink):** Tart and cooling
- **Star Beer or Guinness:** The traditional Nigerian beer pairing
- **Fresh coconut water:** Natural and hydrating

## Regional Variations

While Northern Nigerian Suya is the most famous, you'll find regional variations:

- **Lagos-style Suya:** Often spicier with extra Cameroon pepper
- **Abuja Suya:** Known for generous portions and extra yaji
- **Chicken Suya:** A popular alternative to beef
- **Fish Suya:** Coastal variation using catfish or tilapia
- **Kilishi:** Dried, spiced meat similar to jerky—Suya's preserved cousin

## Suya Culture

Suya is more than food—it's a social experience. Suya spots are gathering places where friends meet, business deals are made, and late-night cravings are satisfied. The sight of a skilled Mai Suya working the grill, the sizzle of meat hitting hot coals, and the communal atmosphere create an experience that's quintessentially Nigerian.

## Health Benefits

Beyond its incredible taste, Suya offers nutritional benefits:
- **High in protein** from the meat
- **Peanuts provide healthy fats** and additional protein
- **Ginger and garlic** have anti-inflammatory properties
- **Spices boost metabolism** and aid digestion

Of course, moderation is key—Suya is rich and can be high in sodium.

## Making Suya at Home

Want to try making Suya yourself? Here's a simplified recipe:

**Ingredients:**
- 500g beef sirloin, thinly sliced
- 1/2 cup ground peanuts
- 2 tbsp ground ginger
- 1 tbsp garlic powder
- 1 tbsp onion powder
- 1-2 tbsp cayenne pepper
- 1 tbsp paprika
- 1 stock cube, crushed
- Salt to taste
- Vegetable oil

**Instructions:**
1. Mix all dry ingredients to create yaji
2. Coat meat generously with yaji and a bit of oil
3. Thread onto skewers
4. Grill over high heat, turning frequently, for 8-10 minutes
5. Serve immediately with extra yaji, onions, and tomatoes

## Experience Authentic Suya at Boomiis

While homemade Suya is delicious, nothing compares to the real deal prepared by experienced hands. At Boomiis, we've invested in a custom-built charcoal grill that replicates the traditional open-flame method. Our chefs have mastered the art of timing—achieving that perfect char while keeping the meat tender and juicy.

We offer:
- **Classic Beef Suya:** The traditional favorite
- **Chicken Suya:** A lighter alternative
- **Suya Platter:** Perfect for sharing, served with sides
- **Suya Wrap:** A modern twist for on-the-go dining

Each order comes with our house-made yaji, fresh vegetables, and your choice of traditional Nigerian drinks.

## Visit Us Today

Ready to experience Nigeria's favorite street food in the heart of London? Visit Boomiis and let us transport you to the bustling Suya spots of Lagos, Kano, and Abuja.

**Book your table now and discover why Suya has captured hearts around the world!**

*Boomiis—Bringing the Streets of West Africa to Your Table*`,
    published_at: new Date('2024-03-01'),
    is_published: true,
    featured_image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=1200&h=630&fit=crop"
  }
];

// Insert blog posts
for (const post of blogPosts) {
  await connection.execute(
    `INSERT INTO blog_posts (title, slug, excerpt, content, author_id, published_at, is_published, featured_image, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [post.title, post.slug, post.excerpt, post.content, authorId, post.published_at, post.is_published, post.featured_image]
  );
}

console.log(`✅ Successfully seeded ${blogPosts.length} blog posts!`);

await connection.end();
