// AdminLogin.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaTooth, FaCalendarCheck, FaShieldAlt, FaUsers,
  FaXRay, FaFillDrip, FaTeethOpen, FaChild,
  FaMicroscope, FaUserMd, FaAward, FaRupeeSign,
  FaFirstAid, FaQuoteLeft, FaStar, FaStarHalfAlt,
  FaPhoneAlt, FaEnvelope, FaMapMarkerAlt,
  FaFacebookF, FaTwitter, FaInstagram, FaYoutube
} from 'react-icons/fa';
import './AppHome.css';

const AppHome = () => {
  const navigate = useNavigate();

  // Add class to body for home page specific styling
  useEffect(() => {
    document.body.classList.add('home-page');
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleBookAppointment = () => {
    navigate('/user');
  };

  return (
    <>
      <div className="dental-app">
        <div className="container-main">
          <a href="#" className="logo-main">
            <img src="logo.png" alt="SRM Dental College Logo" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40/E0F2F7/2C3E50?text=LOGO'; }} />
            SRM Dental College
          </a>
          <nav>
            <ul>
              <li><a href="#">Home</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#doctors">Doctors</a></li>
              <li><a href="#resources">Patient Resources</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </nav>
          <div className="auth-buttons">
            <button onClick={handleLogin}>Login</button>
          </div>
        </div>
      </div>

      <main>
        <section className="hero">
          <div className="container-main">
            <h1>Achieve Your Brightest Smile with SRM Dental College</h1>
            <p>Providing compassionate, state-of-the-art dental care for your entire family.</p>
            <div className="cta-buttons">
              <a href="#services" className="secondary">Explore our services</a>
              <a href="/user" className="book-slot" onClick={(e) => { e.preventDefault(); handleBookAppointment(); }}>Book an appointment</a>
            </div>
          </div>
        </section>

        <section className="welcome" id="about">
          <div className="container-main">
            <h2>Welcome to SRM Dental College: Your Partner in Oral Health</h2>
            <p>At SRM Dental College, we are dedicated to providing exceptional dental care in a comfortable and welcoming environment. Our experienced team uses advanced technology to ensure every visit is pleasant and effective, helping you achieve and maintain a healthy, beautiful smile for life.</p>
            <div className="highlights">
              <div className="highlight-item">
                <FaTooth className="icon" />
                <h3>Expert Care</h3>
              </div>
              <div className="highlight-item">
                <FaCalendarCheck className="icon" />
                <h3>Easy Appointments</h3>
              </div>
              <div className="highlight-item">
                <FaShieldAlt className="icon" />
                <h3>Trusted Professionals</h3>
              </div>
              <div className="highlight-item">
                <FaUsers className="icon" />
                <h3>Family-Friendly</h3>
              </div>
            </div>
          </div>
        </section>

        <section className="services" id="services">
          <div className="container-main">
            <h2>Our Specialized Dental Services</h2>
            <div className="services-grid">
              <div className="service-card">
                <div className="icon-or-image">
                  <FaXRay className="icon" />
                </div>
                <h3>Oral Medicine and Radiology (OMR)</h3>
                <p>Deals with diagnosis and medical management of oral diseases, and includes dental radiology (X-rays, CBCT).</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <img
                    src="./images/omfs.png"
                    alt="Oral and Maxillofacial Surgery Icon"
                    onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x50/7ed6df/25286b?text=OMFS'; }}
                  />
                </div>
                <h3>Oral and Maxillofacial Surgery (OMFS)</h3>
                <p>Focuses on surgical treatments — like tooth extractions, trauma, jaw surgeries, cysts, tumors, and implants.</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <img
                    src="./images/pros.png"
                    alt="Prosthodontics Icon"
                    onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/50x50/7ed6df/25286b?text=PROS'; }}
                  />
                </div>
                <h3>Prosthodontics</h3>
                <p>Specializes in replacement of missing teeth through crowns, bridges, dentures, and implants.</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <FaFillDrip className="icon" />
                </div>
                <h3>Conservative Dentistry and Endodontics</h3>
                <p>Concerned with tooth preservation through fillings, root canal treatments, and cosmetic restorations.</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <FaTooth className="icon" />
                </div>
                <h3>Periodontics</h3>
                <p>Manages gum and supporting structures of teeth — including scaling, flap surgeries, and bone grafting.</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <FaTeethOpen className="icon" />
                </div>
                <h3>Orthodontics</h3>
                <p>Deals with alignment of teeth and jaws using braces, aligners, and other appliances.</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <FaChild className="icon" />
                </div>
                <h3>Pedodontics (Pediatric Dentistry)</h3>
                <p>Provides dental care to children, including preventive and interceptive treatments.</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <FaMicroscope className="icon" />
                </div>
                <h3>Oral Pathology and Microbiology</h3>
                <p>Studies diseases affecting the oral cavity through microscopic and molecular diagnosis.</p>
                <a href="#">Learn More</a>
              </div>
              <div className="service-card">
                <div className="icon-or-image">
                  <FaUsers className="icon" />
                </div>
                <h3>Public Health Dentistry (Community Dentistry)</h3>
                <p>Focuses on promoting oral health at the community level through education, screening, and outreach programs.</p>
                <a href="#">Learn More</a>
              </div>
            </div>
          </div>
        </section>

        <section className="why-choose-us">
          <div className="container-main">
            <h2>Why Patients Trust SRM Dental College</h2>
            <div className="why-choose-us-grid">
              <div className="reason-item">
                <FaUserMd className="icon" />
                <div className="text-content">
                  <h3>Expert Care Team</h3>
                  <p>Highly experienced doctors, surgeons, and faculty provide compassionate, patient-focused care. Every case is managed with precision, empathy, and clinical expertise.</p>
                </div>
              </div>
              <div className="reason-item">
                <FaMicroscope className="icon" />
                <div className="text-content">
                  <h3>Advanced Technology</h3>
                  <p>Equipped with digital scanners, CAD/CAM systems, and modern diagnostic tools. We ensure accurate treatment planning and comfortable procedures.</p>
                </div>
              </div>
              <div className="reason-item">
                <FaAward className="icon" />
                <div className="text-content">
                  <h3>Top-Ranked Institution</h3>
                  <p>Nationally recognized for excellence in dental education and patient care. Treatment protocols are guided by the latest research and innovations.</p>
                </div>
              </div>
              <div className="reason-item">
                <FaRupeeSign className="icon" />
                <div className="text-content">
                  <h3>Affordable Treatment</h3>
                  <p>World-class care at accessible costs through supervised student clinics. We make dental treatment budget-friendly without compromising on quality.</p>
                </div>
              </div>
              <div className="reason-item">
                <FaShieldAlt className="icon" />
                <div className="text-content">
                  <h3>Safe & Sterile Environment</h3>
                  <p>Our clinics follow strict sterilization and infection control protocols. Patients are treated in a clean, secure, and well-regulated environment.</p>
                </div>
              </div>
              <div className="reason-item">
                <FaFirstAid className="icon" />
                <div className="text-content">
                  <h3>Emergency & Surgical Care Facilities</h3>
                  <p>Fully equipped trauma care unit.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="testimonials">
          <div className="container-main">
            <h2>Hear From Our Happy Patients</h2>
            <div className="testimonial-grid">
              <div className="testimonial-card">
                <FaQuoteLeft className="quote-icon" />
                <p>"I had a wonderful experience at SRM Dental College. The staff was incredibly friendly and professional, and my dental implant procedure was seamless. I highly recommend them!"</p>
                <div className="testimonial-author">
                  - Priya S.
                  <div className="stars">
                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <FaQuoteLeft className="quote-icon" />
                <p>"The orthodontics department is fantastic! My clear aligner treatment was explained thoroughly, and I'm thrilled with the results. Thank you, SRM Dental College!"</p>
                <div className="testimonial-author">
                  - Rahul K.
                  <div className="stars">
                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStarHalfAlt />
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <FaQuoteLeft className="quote-icon" />
                <p>"My child's first dental visit was made so comfortable by the Pedodontics team. They are truly amazing with kids and made it a fun experience!"</p>
                <div className="testimonial-author">
                  - Meena L.
                  <div className="stars">
                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                  </div>
                </div>
              </div>
              <div className="testimonial-card">
                <FaQuoteLeft className="quote-icon" />
                <p>"I came for a complex root canal, and the Endodontics team was incredibly skilled and gentle. The procedure was pain-free, and recovery was quick. Highly recommended!"</p>
                <div className="testimonial-author">
                  - Suresh V.
                  <div className="stars">
                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="blog" id="resources">
          <div className="container-main">
            <h2>Latest Dental Health Tips</h2>
            <div className="blog-posts-grid">
              <div className="blog-post-card">
                <img src="./images/oral.webp" alt="Oral hygiene awareness" />
                <div className="blog-post-content">
                  <h3>Oral hygiene awareness and practice among dental college patients</h3>
                  <p>A cross-sectional study in North India showing a serious gap in awareness and habits—highlighting the need for educational programs.</p>
                  <a href="#">Read More &rarr;</a>
                </div>
              </div>
              <div className="blog-post-card">
                <img src="./images/Overall-health.webp" alt="Oral health's effect on overall community well-being" />
                <div className="blog-post-content">
                  <h3>Oral health's effect on overall community well-being</h3>
                  <p>A comprehensive report linking oral care to physical, mental, social, and economic health.</p>
                  <a href="#">Read More &rarr;</a>
                </div>
              </div>
              <div className="blog-post-card">
                <img src="./images/cdc.png" alt="CDC's oral hygiene tips for adults" />
                <div className="blog-post-content">
                  <h3>CDC's oral hygiene tips for adults</h3>
                  <p>Guidance on brushing, flossing, managing dry mouth, and lifestyle choices like alcohol avoidance & HPV vaccination.</p>
                  <a href="#">Read More &rarr;</a>
                </div>
              </div>
              <div className="blog-post-card">
                <img src="./images/world-oral-health-day.jpg" alt="WHO's oral health fact sheet" />
                <div className="blog-post-content">
                  <h3>WHO's oral health fact sheet</h3>
                  <p>Stresses that most oral diseases are preventable and highlights the role of fluoride, diet, and access to care.</p>
                  <a href="#">Read More &rarr;</a>
                </div>
              </div>
              <div className="blog-post-card">
                <img src="./images/time.jpeg" alt="TIME Health: 'Reading This Will Make You Want to Floss'" />
                <div className="blog-post-content">
                  <h3>TIME Health: "Reading This Will Make You Want to Floss"</h3>
                  <p>Explains the oral-systemic link: flossing and brushing reduce risks of heart disease, diabetes, cancer, and more.</p>
                  <a href="#">Read More &rarr;</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="container-main">
            <h2>Connect With Us</h2>
            <div className="contact-info">
              <div className="contact-item">
                <FaPhoneAlt className="icon" />
                <h3>Call Us</h3>
                <p><a href="tel:+914412345678">+044 2249 0526</a></p>
              </div>
              <div className="contact-item">
                <FaEnvelope className="icon" />
                <h3>Email Us</h3>
                <p><a href="mailto:info@srmdentalcollege.com">info@srmdentalcollege.com</a></p>
              </div>
              <div className="contact-item">
                <FaMapMarkerAlt className="icon" />
                <h3>Visit Us</h3>
                <p>
                  SRM Dental College-Ramapuram,<br />
                  Chennai - 600089, Tamil Nadu, India
                </p>
              </div>
            </div>
            <div className="social-media">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FaFacebookF /></a>
              <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><FaTwitter /></a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
              <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><FaYoutube /></a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container-main">
          <p>&copy; 2025 SRM Dental College. All rights reserved.</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Disclaimer</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default AppHome;