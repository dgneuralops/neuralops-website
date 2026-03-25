(function ($) {
	"use strict";

	var windowOn = $(window);

	/*===========================================
		=          Sticky Header Js         =
	=============================================*/
	windowOn.on('scroll', function () {
		var scroll = windowOn.scrollTop();
		if (scroll < 20) {
			$("#header-sticky").removeClass("header-sticky");
		} else {
			$("#header-sticky").addClass("header-sticky");
		}
	});

	/*===========================================
		=            PreLoader Js         =
	=============================================*/
	function loader() {
		$(window).on("load", function () {
			// Animate loader off screen
			$(".preloader").addClass("loaded");
			$(".preloader").delay(600).fadeOut();
		});
	}
	loader();


	/*===========================================
		=    		Mobile Menu			      =
	=============================================*/
	//SubMenu Dropdown Toggle
	if ($('.tdmenu__wrap li.menu-item-has-children ul').length) {
		$('.tdmenu__wrap .navigation li.menu-item-has-children').append('<div class="dropdown-btn"><span class="plus-line"></span></div>');
	}

	//Mobile Nav Hide Show
	if ($('.tdmobile__menu').length) {

		var mobileMenuContent = $('.tdmenu__wrap .tdmenu__main-menu').html();
		$('.tdmobile__menu .tdmobile__menu-box .tdmobile__menu-outer').append(mobileMenuContent);

		//Dropdown Button
		$('.tdmobile__menu li.menu-item-has-children .dropdown-btn').on('click', function () {
			$(this).toggleClass('open');
			$(this).prev('ul').slideToggle(300);
		});
		//Menu Toggle Btn
		$('.mobile-nav-toggler').on('click', function () {
			$('body').addClass('mobile-menu-visible');
		});

		//Menu Toggle Btn
		$('.tdmobile__menu-backdrop, .tdmobile__menu .close-btn').on('click', function () {
			$('body').removeClass('mobile-menu-visible');
		});
	};


	/*===========================================
		=           Scroll Up  	         =
	=============================================*/
	$(window).on('scroll', function () {
		var scroll = $(window).scrollTop();
		if (scroll < 245) {
			$("#sticky-header").removeClass("sticky-menu");
			$('.scroll-to-target').removeClass('open');
			$("#header-fixed-height").removeClass("active-height");

		} else {
			$("#sticky-header").addClass("sticky-menu");
			$('.scroll-to-target').addClass('open');
			$("#header-fixed-height").addClass("active-height");
		}
	});

	if ($('.scroll-to-target').length) {
	$(".scroll-to-target").on('click', function () {
		var target = $(this).attr('data-target');
		// animate
		$('html, body').animate({
		scrollTop: $(target).offset().top
		}, 0);

	});
	}

	/*===========================================
		=          Data Background    =
	=============================================*/
	$("[data-background]").each(function () {
		$(this).css("background-image", "url(" + $(this).attr("data-background") + ")")
	});

	$("[data-bg-color]").each(function () {
		$(this).css("background-color", $(this).attr("data-bg-color"));
	});

	$("[data-width]").each(function () {
		$(this).css("width", $(this).attr("data-width") + "px");
	});

	/*=============================================
		=            Header Search            =
	=============================================*/
	$(".search-open-btn").on("click", function () {
		$(".search__popup").addClass("search-opened");
		$(".search-popup-overlay").addClass("search-popup-overlay-open");
	});
	$(".search-close-btn").on("click", function () {
		$(".search__popup").removeClass("search-opened");
		$(".search-popup-overlay").removeClass("search-popup-overlay-open");
	});

	/*=============================================
	=     Offcanvas Menu      =
	=============================================*/
	$(".menu-tigger").on("click", function () {
		$(".offCanvas__info, .offCanvas__overly").addClass("active");
		return false;
	});
	$(".menu-close, .offCanvas__overly").on("click", function () {
		$(".offCanvas__info, .offCanvas__overly").removeClass("active");
	});



	/*=============================================
		=    		Isotope	Active  	      =
	=============================================*/
	$('.project-active-two').imagesLoaded(function () {
		// init Isotope
		var $grid = $('.project-active-two').isotope({
			itemSelector: '.grid-item',
			percentPosition: true,
			masonry: {
				columnWidth: '.grid-item',
			}
		});
		// filter items on button click
		$('.project__menu-nav').on('click', 'button', function () {
			var filterValue = $(this).attr('data-filter');
			$grid.isotope({ filter: filterValue });
		});

	});
	//for menu active class
		$('.project__menu-nav button').on('click', function (event) {
		$(this).siblings('.active').removeClass('active');
		$(this).addClass('active');
		event.preventDefault();
	});




	/*===========================================
		=       Odometer Active    =
	=============================================*/
	$('.odometer').appear(function (e) {
		var odo = $(".odometer");
		odo.each(function () {
			var countNumber = $(this).attr("data-count");
			$(this).html(countNumber);
		});
	});


	/*===========================================
		=        Magnific Popup    =
	=============================================*/
	$('.popup-image').magnificPopup({
		type: 'image',
		gallery: {
			enabled: true
		}
	});


	/*===========================================
		=        magnificPopup video view    =
	=============================================*/
	$('.popup-video').magnificPopup({
		type: 'iframe'
	});



	/*=============================================
		=       Nice Select Js      =
	=============================================*/
	$('.select').niceSelect();

	/*=============================================
		=      Wow Js     =
	=============================================*/
	new WOW().init();

	/*=============================================
		=        increment-decrement	      =
	=============================================*/

	$('.decrement').on('click', function () {
		var $input = $(this).parent().find('input');
		var count = parseInt($input.val()) - 1;
		count = count < 1 ? 1 : count;
		$input.val(count);
		$input.change();
		return false;
	});

	$('.increment').on('click', function () {
		var $input = $(this).parent().find('input');
		$input.val(parseInt($input.val()) + 1);
		$input.change();
		return false;
	});

	/*=============================================
		=       slider-range-min5	      =
	=============================================*/
	$("#slider-range2").slider({
		range: true,
		min: 0,
		max: 500,
		values: [75, 300],
		slide: function (event, ui) {
			$("#amount5").val("$" + ui.values[0] + " - $" + ui.values[1]);
		}
		});
	$("#amount5").val("$" + $("#slider-range2").slider("values", 0) +
			" - $" + $("#slider-range2").slider("values", 1));
	
	/*=============================================
		=       td-hero-text-slide-active	      =
	=============================================*/

	var td_hero_text_slide = new Swiper(".td-hero-text-slide-active", {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		slidesPerView: 1,
		spaceBetween: 30,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 10000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});

	/*=============================================
		=      smooth-wrapper      =
	=============================================*/
	if($('#smooth-wrapper').length && $('#smooth-content').length){
		gsap.registerPlugin(ScrollTrigger, ScrollSmoother, TweenMax, ScrollToPlugin);
	
		gsap.config({
			nullTargetWarn: false,
		});
	
		let smoother = ScrollSmoother.create({
			smooth: 2,
			effects: true,
			smoothTouch: 0.1,
			normalizeScroll: false,
			ignoreMobileResize: true,
		});
	}

	/*=============================================
		=      td_testimonial_slider      =
	=============================================*/

	var td_testimonial_slider = new Swiper(".td-testimonial-slider", {
		slidesPerView: 1,
		speed: 700,
		spaceBetween: 30,
		loop: true,
		navigation: {
			nextEl: ".td-testimonial-next",
			prevEl: ".td-testimonial-prev",
		},
	});


	/*=============================================
		=      td_brand_slider-active      =
	=============================================*/
	var td_brand_slider= new Swiper(".td-brand-slide-active", {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		centeredSlides: true,
		allowTouchMove: false,
		speed: 8000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});


	/*=============================================
		=      td-text-invert      =
	=============================================*/
	const split = new SplitText(".td-text-invert, .td-text-opacity", { type: "lines" });

	split.lines.forEach((target) => {
		gsap.to(target, {
			backgroundPositionX: 0,
			ease: "none",
			scrollTrigger: {
				trigger: target,
				scrub: 1,
				start: 'top 85%',
				end: "bottom center"
			}
		});
	});

	/*=============================================
		=      td-text-invert      =
	=============================================*/

	if ($('.td-fixed-title-wrap').length > 0) {
		let project_text = gsap.timeline({
			scrollTrigger: {
				trigger: ".td-fixed-title-wrap",
				start: 'top center-=350',
				end: "bottom 80%",
				pin: ".td-fixed-title",
				markers: false,
				pinSpacing: false,
				scrub: 1,
			}
		})
	}

	let pc = gsap.matchMedia();
	pc.add("(min-width: 992px)", () => {
		if ($('.td-fixed-thumb-wrap').length > 0) {
			let project_text = gsap.timeline({
				scrollTrigger: {
					trigger: ".td-fixed-thumb-wrap",
					start: 'top center-=350',
					end: "bottom 65%",
					pin: ".td-fixed-thumb",
					markers: false,
					pinSpacing: false,
					scrub: 1,
				}
			})
		}	
	});

	/*=============================================
		=      td-testimonial-3-slider      =
	=============================================*/
	var slider = new Swiper('.td-testimonial-3-slider', {
		slidesPerView: 1,
		speed: 700,
		spaceBetween: 30,
		loop: true,
		navigation: {
			nextEl: ".td-testimonial-next",
			prevEl: ".td-testimonial-prev",
		},
		autoplay: {
			delay: 4000,
		  },
		breakpoints: {
			'1400': {
				slidesPerView: 3,
			},
			'1200': {
				slidesPerView: 2,
			},
			'991': {
				slidesPerView: 2,
			},
			'768': {
				slidesPerView: 2,
			},
			'576': {
				slidesPerView: 1,
			},
			'0': {
				slidesPerView: 1,
			},
		},
	});


	/*=============================================
		=      td-testimonial-3-slider      =
	=============================================*/
	var td_portfolio_4_slider = new Swiper(".td-portfolio-4-slider", {
		slidesPerView: 1,
		speed: 700,
		spaceBetween: 30,
		loop: true,
	});

	/*=============================================
		=     hover-btn-wrapper      =
	=============================================*/
	if ($('.td-btn-trigger').length > 0) {

		gsap.set(".td-btn-bounce", { y: -100, opacity: 0 });
		var mybtn = gsap.utils.toArray(".td-btn-bounce");
		mybtn.forEach((btn) => {
			var $this = $(btn);
			gsap.to(btn, {
				scrollTrigger: {
					trigger: $this.closest('.td-btn-trigger'),
					start: "top center",
					markers: false
				},
				duration: 1,
				ease: "bounce.out",
				y: 0,
				opacity: 1,
			})
		});
	}

	/*=============================================
		=     text-animetion-jsap      =
	=============================================*/
	if ($('.td-title-anim').length > 0) {
		let splitTitleLines = gsap.utils.toArray(".td-title-anim");
		splitTitleLines.forEach(splitTextLine => {
			const tl = gsap.timeline({
			scrollTrigger: {
				trigger: splitTextLine,
				start: 'top 90%',
				end: 'bottom 60%',
				scrub: false,
				markers: false,
				toggleActions: 'play none none none'
			}
			});

			const itemSplitted = new SplitText(splitTextLine, { type: "words, lines" });
			gsap.set(splitTextLine, { perspective: 300});
			itemSplitted.split({ type: "lines" })
			tl.from(itemSplitted.lines, { duration: 1, delay: 0.3, opacity: 0, rotationX: -50, force3D: true, transformOrigin: "top center -50", stagger: 0.2 });
		});	
	}

	////////////////////////////////////////////////////
	// 21. cm-split-text
	$(function() {
		var st = $(".td-split-text");
        if(st.length == 0) return;
        gsap.registerPlugin(SplitText);
        st.each(function(index, el) {
            el.split = new SplitText(el, {
                type: "lines,words,chars",
                linesClass: "td-split-line"
            });
            gsap.set(el, { perspective: 400 });

            if( $(el).hasClass('td-split-in-right') ){
                gsap.set(el.split.chars, {
                    opacity: 0,
                    x: "50",
                    ease: "Back.easeOut",
                });
            }
            el.anim = gsap.to(el.split.chars, {
                scrollTrigger: {
                    trigger: el,
                    start: "top 90%",
                },
                x: "0",
                y: "0",
                rotateX: "0",
                scale: 1,
                opacity: 1,
                duration: 0.8,
                stagger: 0.03,
            });
        });
	});

	/*=============================================
		=      td-testimonial-5-slider      =
	=============================================*/

	var td_testimonial_slider_5 = new Swiper(".td-testimonial-5-slider", {
		slidesPerView: 1,
		speed: 700,
		spaceBetween: 30,
		loop: true,
		navigation: {
			nextEl: ".td-testimonial-5-next",
			prevEl: ".td-testimonial-5-prev",
		},
	});

	/*=============================================
		=      Image Reveal Animation      =
	=============================================*/

	
	let td_image_animetion = document.querySelectorAll(".td_image_animetion");

	td_image_animetion.forEach((img_reveal) => {
		let image = img_reveal.querySelector("img");
		let tl = gsap.timeline({
			scrollTrigger: {
				trigger: img_reveal,
				start: "top 70%",
			}
		});

		tl.set(img_reveal, { autoAlpha: 1 });
		tl.from(img_reveal, 1.5, {
			xPercent: -100,
			ease: Power2.out
		});
		tl.from(image, 1.5, {
			xPercent: 100,
			scale: 1.5,
			delay: -1.5,
			ease: Power2.out
		});
	});


	/*=============================================
		=      td-hero-6-slider      =
	=============================================*/
	var td_hero_6_slider = new Swiper('.td-hero-6-slider', {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		centeredSlides: true,
		allowTouchMove: false,
		spaceBetween: 30,
		speed: 5000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});

	/*=============================================
		=      td-testimonial-6-slider      =
	=============================================*/
    var slidernav2 = new Swiper(".td-testimonial-6-content-active", {
        spaceBetween: 0,
        slidesPerView: 1,
        loop: false,
        allowTouchMove: true,
        autoplay: {
            delay: 6000,
        },
    });

    var slidernav3 = new Swiper(".td-testimonial-6-thumb-active", {
        spaceBetween: 0,
        slidesPerView: 3,
        loop: false,
        allowTouchMove: false, 
        slideToClickedSlide: true,
    });

	slidernav3.on('click', function () {
		let clickedIndex = slidernav3.clickedIndex;
		if (clickedIndex !== undefined) {
			slidernav2.slideTo(clickedIndex);
		}
	});
	
	/*=============================================
		=      td-brands-6-slider      =
	=============================================*/
	var td_brands_6_slider = new Swiper('.td-testimonial-6-brands-slider', {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		centeredSlides: true,
		allowTouchMove: false,
		spaceBetween: 30,
		speed: 5000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});


	/*=============================================
		=      td-team-6-slider      =
	=============================================*/
	var td_team_6_slider = new Swiper('.td-team-6-slider', {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		centeredSlides: true,
		allowTouchMove: false,
		spaceBetween: 30,
		speed: 5000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});

	/*=============================================
		=       td-contact-7-slide-active	      =
	=============================================*/
	var td_contact_text_slide = new Swiper(".td-contact-7-slide-active", {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		slidesPerView: 1,
		spaceBetween: 140,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 10000,
		autoplay: {
		  delay: 1,
		  disableOnInteraction: true,
		},
	});

	/*=============================================
		=       Portfolio Main Slider	      =
	=============================================*/
	let slider_showcase = new Swiper('.slider-showcase-active', {
		slidesPerView: 1,
		spaceBetween: 0,
		effect: 'fade',
		loop: false,
		mousewheel: true,
	});


	/*=============================================
		=       td-portfolio-slicer-active	      =
	=============================================*/

	let td_portfolio = new Swiper('.td-portfolio-slicer-active', {
		modules: [EffectSlicer],
		effect: 'slicer',
		slicerEffect: {
		  split: 5,
		},
		direction: 'vertical',
		speed: 600,
		grabCursor: true,
		navigation: {
		  nextEl: '.td-portfolio-slicer-button-next',
		  prevEl: '.td-portfolio-slicer-button-prev',
		},
	  });

	/*=============================================
		=       td-contact-7-slide-active	      =
	=============================================*/
	let td_showcase_slide_active = new Swiper(".td-portfolio-showcase-slide-active", {
        spaceBetween: 80,
        slidesPerView: 1,
        loop: true,
        allowTouchMove: true,
		centeredSlides: true,
		speed: 600,
		navigation: {
			nextEl: '.td-portfolio-showcase-button-next',
			prevEl: '.td-portfolio-showcase-button-prev',
		},
		pagination: {
			el: ".td-portfolio-showcase-pagenation",
			clickable: true,
		},
		breakpoints: {
			'1400': {
				slidesPerView: 2,
			},
			'1200': {
				slidesPerView: 2,
				spaceBetween: 40,
			},
			'991': {
				slidesPerView: 1,
				spaceBetween: 40,
			},
			'768': {
				slidesPerView: 1,
				spaceBetween: 40,
			},
			'576': {
				slidesPerView: 1,
				spaceBetween: 30,
			},
			'0': {
				slidesPerView: 1,
				spaceBetween: 40,
			},
		},
	});


	/*=============================================
		=       td-thumb-hover-item	      =
	=============================================*/
	const hoverItem = document.querySelectorAll(".td-thumb-hover-item");
	function moveImage(e, hoverItem, index) {
		const item = hoverItem.getBoundingClientRect();
		const x = e.clientX - item.x;
		const y = e.clientY - item.y;
		if (hoverItem.children[index]) {
			hoverItem.children[index].style.transform = `translate(${x}px, ${y}px)`;
		}
	}
	hoverItem.forEach((item, i) => {
		item.addEventListener("mousemove", (e) => {
			setInterval(moveImage(e, item, 1), 50);
		});
	});

	/*=============================================
		=       td-service-pin-items	      =
	=============================================*/

	let td = gsap.matchMedia();
	td.add("(min-width: 991px)", () => {

		let tdtl = gsap.timeline();
		let projectpanels = document.querySelectorAll('.td-service-pin-item-panel')
		projectpanels.forEach((section, index) => {
			tdtl.to(section, {
				scrollTrigger: {
					trigger: section,
					pin: section,
					scrub: 1,
					start: 'top top',
					end: "bottom 100%",
					endTrigger: '.td-service-pin-items',
					pinSpacing: false,
					markers: false,
				},
			})
		})

	});


	/*=============================================
		=       Masonary Js	      =
	=============================================*/

	$('.grid').imagesLoaded(function () {
		// init Isotope
		var $grid = $('.grid').isotope({
			itemSelector: '.grid-item',
			percentPosition: true,
			masonry: {
				columnWidth: '.grid-item',
			}
		});
		$('.masonary-menu').on('click', 'button', function () {
			var filterValue = $(this).attr('data-filter');
			$grid.isotope({ filter: filterValue });
		});
		$('.masonary-menu button').on('click', function (event) {
			$(this).siblings('.active').removeClass('active');
			$(this).addClass('active');
			event.preventDefault();
		});
	});


	/*=============================================
		=      td-portfolio-visual-slider      =
	=============================================*/
	var slider = new Swiper('.td-portfolio-identity-slider', {
		slidesPerView: 1,
		speed: 700,
		spaceBetween: 30,
		loop: true,
		autoplay: {
			delay: 4000,
		},
		navigation: {
			nextEl: ".td-portfolio-identity-next",
			prevEl: ".td-portfolio-identity-prev",
		},
		breakpoints: {
			'1400': {
				slidesPerView: 2,
			},
			'1200': {
				slidesPerView: 2,
			},
			'991': {
				slidesPerView: 2,
			},
			'768': {
				slidesPerView: 1,
			},
			'576': {
				slidesPerView: 1,
			},
			'0': {
				slidesPerView: 1,
			},
		},
	});


	/*=============================================
		=      slider-range      =
	=============================================*/
	$("#slider-range").slider({
		range: true,
		min: 0,
		max: 1200,
		values: [80, 700],
		slide: function (event, ui) {
			$("#amount").val("$" + ui.values[0] + " - $" + ui.values[1]);
		}
	});
	$("#amount").val("$" + $("#slider-range").slider("values", 0) +
		" - $" + $("#slider-range").slider("values", 1));

	/*=============================================
		=       Mouse Follower      =
	=============================================*/
		const follower = document.querySelector(
			".mouse-follower .cursor-outline"
		);
		const dot = document.querySelector(".mouse-follower .cursor-dot");
		window.addEventListener("mousemove", (e) => {
			follower.animate(
				[
					{
						opacity: 1,
						left: `${e.clientX}px`,
						top: `${e.clientY}px`,
						easing: "ease-in-out",
					},
				],
				{
					duration: 3000,
					fill: "forwards",
				}
			);
			dot.animate(
				[
					{
						opacity: 1,
						left: `${e.clientX}px`,
						top: `${e.clientY}px`,
						easing: "ease-in-out",
					},
				],
				{
					duration: 1500,
					fill: "forwards",
				}
			);
		});

		$("a, button").on("mouseenter mouseleave", function () {
			$(".mouse-follower").toggleClass("hide-cursor");
		});

		var terElement = $(
			"h1, h2, h3, h4, .display-one, .display-two, .display-three, .display-four, .display-five, .display-six"
		);
		$(terElement).on("mouseenter mouseleave", function () {
			$(".mouse-follower").toggleClass("highlight-cursor-head");
			$(this).toggleClass("highlight-cursor-head");
		});

		var terElement = $("p");
		$(terElement).on("mouseenter mouseleave", function () {
			$(".mouse-follower").toggleClass("highlight-cursor-para");
			$(this).toggleClass("highlight-cursor-para");
		});


	/*=============================================
		=       Service       =
	=============================================*/
	document.addEventListener("DOMContentLoaded", function () {
		let serviceItems = document.querySelectorAll(".service-item");
		let images = document.querySelectorAll(".hover-image");
	
		serviceItems.forEach((item, index) => {
			item.addEventListener("mouseenter", function () {
				serviceItems.forEach((el) => el.classList.remove("active"));
				images.forEach((img) => img.classList.remove("active"));
				this.classList.add("active");
				images[index].classList.add("active");
			});
		});
	});
	
	
	
	/*=============================================
		=      td-portfolio-2-slider     =
	=============================================*/
	var td_portfolio_2_slider = new Swiper('.td-portfolio-2-slider', {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		spaceBetween: 15,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 6000,
		autoplay: {
		  delay: false,
		  disableOnInteraction: false,
		  pauseOnMouseEnter: true,
		},
	});

	var td_portfolio_2_slider_2 = new Swiper('.td-portfolio-2-slider-2', {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		spaceBetween: 15,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 6000,
		autoplay: {
		  delay: false,
		  disableOnInteraction: false,
		  pauseOnMouseEnter: true,
		},
	});

	/*=============================================
		=      td-portfolio-2-slider     =
	=============================================*/

	var td_portfolio_2_slider = new Swiper('.td-text-2-home-slider', {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		spaceBetween: 100,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 8000,
		autoplay: {
		  delay: false,
		},
	});


	/*=============================================
		=      td-portfolio-2-slider     =
	=============================================*/

	var td_portfolio_2_slider = new Swiper('.td-feature-2-slider', {
		loop: true,
		freemode: true,
		slidesPerView: 'auto',
		spaceBetween: 75,
		centeredSlides: true,
		allowTouchMove: false,
		speed: 8000,
		autoplay: {
		  delay: false,
		},
		breakpoints: {
			'992': {
				spaceBetween: 75,
			},
			'768': {
				spaceBetween: 25,
			},
			'576': {
				spaceBetween: 25,
			},
			'0': {
				slidesPerView: 1,
			},
		},
	});

})(jQuery);


