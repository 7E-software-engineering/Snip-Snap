import os
from flask import render_template, request, redirect, session, url_for, jsonify, abort
from .auth import verify_supabase_jwt
from .input_sanitization import sanitize_input
from .access import login_required, roles_required
from .db import get_user_postcode, get_user_location, link_auth_user_id, get_app_user_by_auth_user_id, get_app_user_by_email, get_user_promo, get_barber_public_by_user_id, get_barber_id_from_user_id, update_barber_profile, get_barbershop_by_id, get_shifts_for_barber, get_shop_opening_hours, get_reviews_for_barber, submit_barber_review, get_profile_photo, get_barber_gallery_photos, get_barbershop_gallery_photos, _get_conn, add_shift, delete_shift, update_barber_bio, update_barbershop_website, update_barber_social_links
from .supabase_storage import sign_storage_path
from uuid import uuid4
from datetime import datetime, time

def get_closing_soon_info(close_time_str, current_day_num):
    """
    Check if a closing time is within the next 2 hours.
    Returns dict with 'closing_soon' bool and 'mins_until_close' int.
    """
    try:
        now = datetime.now()
        current_mins = now.hour * 60 + now.minute
        
        # Parse close time (format: "HH:MM")
        close_parts = close_time_str.split(':')
        close_hour = int(close_parts[0])
        close_min = int(close_parts[1])
        close_mins = close_hour * 60 + close_min
        
        # Calculate minutes until close (same day)
        mins_until_close = close_mins - current_mins
        
        # If negative, shop has already closed or closing is tomorrow
        if mins_until_close < 0:
            return {"closing_soon": False, "mins_until_close": 0}
        
        # Check if closing within next 2 hours (120 minutes)
        if mins_until_close <= 120:
            return {"closing_soon": True, "mins_until_close": mins_until_close}
        
        return {"closing_soon": False, "mins_until_close": 0}
    except:
        return {"closing_soon": False, "mins_until_close": 0}

def get_current_day_num():
    """Get current day of week (0=Monday, 6=Sunday)."""
    return datetime.now().weekday()

def register_routes(app):

    print("SUPABASE_URL =", os.getenv("SUPABASE_URL"))

    @app.get("/api/reviews/<int:barber_id>")
    def get_barber_reviews(barber_id: int):
        """API to fetch reviews for a specific barber."""
        reviews = get_reviews_for_barber(barber_id)
        # Convert datetime objects to strings so JavaScript can read them
        for r in reviews:
            r['created_at'] = r['created_at'].isoformat()
        return jsonify(reviews)

    @app.post("/api/reviews/submit")
    @login_required
    def post_review():
        """API to save a new review from the widget."""
        data = request.json
        user_id = session["user"]["id"]
        
        try:
            review_id = submit_barber_review(
                barber_id=data['barber_id'],
                customer_id=user_id,
                rating=data['rating'],
                comment=data['comment']
            )
            return jsonify({"ok": True, "review_id": review_id})
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 400
    @app.get("/api/barber/<int:barber_id>/photos")
    def get_barber_photos(barber_id: int):
        """API to fetch gallery photos for a barber (is_post = false)."""
        try:
            photos = get_barber_gallery_photos(barber_id, limit=16)
            # Sign storage URLs for secure access
            for photo in photos:
                if photo.get("image_url"):
                    photo["image_url"] = sign_storage_path(photo["image_url"], expires_in=3600)
                if photo.get("promo_profile_image_url"):
                    photo["promo_profile_image_url"] = sign_storage_path(photo["promo_profile_image_url"], expires_in=3600)
            return jsonify(photos)
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.get("/api/barbershop/<int:barbershop_id>/photos")
    def get_barbershop_photos(barbershop_id: int):
        """API to fetch gallery photos for a barbershop (all barbers, is_post = false)."""
        try:
            photos = get_barbershop_gallery_photos(barbershop_id, limit=16)
            # Sign storage URLs for secure access
            for photo in photos:
                if photo.get("image_url"):
                    photo["image_url"] = sign_storage_path(photo["image_url"], expires_in=3600)
                if photo.get("promo_profile_image_url"):
                    photo["promo_profile_image_url"] = sign_storage_path(photo["promo_profile_image_url"], expires_in=3600)
            return jsonify(photos)
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.get("/api/user/<int:user_id>/barber-id")
    def get_barber_id_endpoint(user_id: int):
        """API to get the barber_id for a given user_id."""
        try:
            barber_id = get_barber_id_from_user_id(user_id)
            if barber_id is None:
                return jsonify({"error": "User is not a barber"}), 404
            return jsonify({"barber_id": barber_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.get("/api/my-photos")
    @login_required
    def get_my_photos():
        """API to get the current barber's non-post photos."""
        try:
            user_id = session["user"]["id"]
            barber_id = get_barber_id_from_user_id(user_id)
            if barber_id is None:
                return jsonify({"error": "User is not a barber"}), 403
            
            photos = get_barber_gallery_photos(barber_id, limit=100)
            # Sign storage URLs for secure access
            for photo in photos:
                if photo.get("image_url"):
                    photo["image_url"] = sign_storage_path(photo["image_url"], expires_in=3600)
                if photo.get("promo_profile_image_url"):
                    photo["promo_profile_image_url"] = sign_storage_path(photo["promo_profile_image_url"], expires_in=3600)
            return jsonify(photos)
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.post("/api/photos/<int:photo_id>/update-tag")
    @login_required
    def update_photo_main_tag(photo_id: int):
        """API to update a photo's main tag."""
        try:
            data = request.get_json()
            main_tag_id = data.get("main_tag_id")
            
            if not main_tag_id:
                return jsonify({"error": "main_tag_id is required"}), 400
            
            user_id = session["user"]["id"]
            barber_id = get_barber_id_from_user_id(user_id)
            if barber_id is None:
                return jsonify({"error": "User is not a barber"}), 403
            
            # Update the photo's main tag
            with _get_conn() as conn:
                with conn.cursor() as cur:
                    # First, verify the photo belongs to this barber
                    cur.execute(
                        "SELECT barber_id FROM HaircutPhoto WHERE photo_id = %s",
                        (photo_id,)
                    )
                    row = cur.fetchone()
                    if not row or row[0] != barber_id:
                        return jsonify({"error": "Photo not found or does not belong to you"}), 403
                    
                    # Update the main tag
                    cur.execute(
                        "UPDATE HaircutPhoto SET main_tag = %s WHERE photo_id = %s",
                        (main_tag_id, photo_id)
                    )
                    conn.commit()
            
            return jsonify({"ok": True, "photo_id": photo_id})
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.post("/api/photos/replace")
    @login_required
    def replace_photo():
        """API to replace a photo file (upload new image for existing photo)."""
        try:
            photo_id = request.form.get("photo_id")
            width = request.form.get("width")
            height = request.form.get("height")
            
            if not photo_id or not width or not height:
                return jsonify({"error": "photo_id, width, and height are required"}), 400
            
            if "photo" not in request.files:
                return jsonify({"error": "No photo file provided"}), 400
            
            file = request.files["photo"]
            if not file.filename or not file.content_type.startswith("image/"):
                return jsonify({"error": "Invalid image file"}), 400
            
            user_id = session["user"]["id"]
            barber_id = get_barber_id_from_user_id(user_id)
            if barber_id is None:
                return jsonify({"error": "User is not a barber"}), 403
            
            # Verify the photo belongs to this barber
            with _get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT barber_id FROM HaircutPhoto WHERE photo_id = %s",
                        (photo_id,)
                    )
                    row = cur.fetchone()
                    if not row or row[0] != barber_id:
                        return jsonify({"error": "Photo not found or does not belong to you"}), 403
            
            # Upload new photo to Supabase storage
            from supabase import create_client
            sb = create_client(
                os.environ["SUPABASE_URL"],
                os.environ["SUPABASE_SERVICE_ROLE_KEY"]
            )
            
            file_data = file.read()
            storage_path = f"haircuts/{barber_id}/{photo_id}_{uuid4().hex[:8]}.jpg"
            
            sb.storage.from_("photos").upload(
                storage_path,
                file_data,
                file_options={"content-type": "image/jpeg"}
            )
            
            # Update the photo record with new image_url
            with _get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE HaircutPhoto SET image_url = %s, width_px = %s, height_px = %s WHERE photo_id = %s",
                        (storage_path, int(width), int(height), photo_id)
                    )
                    conn.commit()
            
            return jsonify({
                "ok": True,
                "photo_id": photo_id,
                "storage_path": storage_path
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/")
    def home():
        return render_template("pages/welcome.html")

    @app.route("/login")
    def login():
        return render_template(
            "pages/login.html",
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_anon_key=os.environ["SUPABASE_ANON_KEY"],
        )

    @app.route("/signup")
    def signup():
        return render_template(
            "pages/signup.html",
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_anon_key=os.environ["SUPABASE_ANON_KEY"],
        )

    @app.route("/logout")
    def logout():
        session.pop("user", None)
        return redirect(url_for("home"))

    # OAuth redirect lands here (browser page that will POST token to /auth/callback)
    @app.route("/auth/redirect")
    def auth_redirect():
        return render_template(
            "pages/auth_redirect.html",
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_anon_key=os.environ["SUPABASE_ANON_KEY"],
        )

    @app.route("/auth/callback", methods=["GET", "POST"])
    def auth_callback():
        # Handle GET requests from OAuth providers (e.g., Google OAuth callback)
        # by rendering the auth_redirect page which will handle session setup
        if request.method == "GET":
            print("\n--- AUTH CALLBACK GET (OAuth redirect) ---")
            return render_template(
                "pages/auth_redirect.html",
                supabase_url=os.environ["SUPABASE_URL"],
                supabase_anon_key=os.environ["SUPABASE_ANON_KEY"],
            )

        # Handle POST requests with access token
        print("\n--- AUTH CALLBACK POST START ---")

        data = request.get_json(silent=True) or {}
        print("Received JSON:", data)

        access_token = data.get("access_token")
        if not access_token:
            print("No access_token received")
            return jsonify({"ok": False, "error": "Missing access_token"}), 400

        print("Access token received. Verifying...")

        try:
            claims = verify_supabase_jwt(access_token)
            print("JWT verified. Claims:", claims)
        except Exception as e:
            print("JWT verification failed:", repr(e))
            return jsonify({"ok": False, "error": str(e)}), 401

        auth_user_id = claims.get("sub")
        email = claims.get("email")

        print("JWT sub:", auth_user_id)
        print("JWT email:", email)

        from .db import get_app_user_by_auth_user_id, link_auth_user_id, get_app_user_by_email

        # Try to get user by auth_user_id first
        app_user = get_app_user_by_auth_user_id(auth_user_id)
        print("DB lookup by auth_user_id:", app_user)

        # If not found, try to link by email
        if not app_user:
            print("Not found by auth_user_id, attempting to link by email...")
            try:
                linked = link_auth_user_id(email, auth_user_id)
                print(f"Link result: {linked}")
                
                # Try lookup again
                app_user = get_app_user_by_auth_user_id(auth_user_id)
                print("DB lookup after linking:", app_user)
            except Exception as e:
                print(f"Failed to link auth_user_id: {e}")

        # Final fallback: lookup by email only
        if not app_user:
            print("Not found by auth_user_id, trying lookup by email...")
            try:
                app_user = get_app_user_by_email(email)
                print("DB lookup by email:", app_user)
            except Exception as e:
                print(f"Failed lookup by email: {e}")

        if not app_user:
            print("No App_User found for auth_user_id or email")
            return jsonify({"ok": False, "error": "User not found in App_User"}), 403

        session["user"] = {
            "id": app_user["user_id"],
            "auth_user_id": app_user["auth_user_id"],
            "email": app_user["email"],
            "username": app_user["username"],
            "role": (app_user["role"] or "").strip().lower(),
        }

        print("Session set to:", session["user"])
        print("--- AUTH CALLBACK POST END ---\n")

        return jsonify({"ok": True})
    
    
    @app.post("/guest/start")
    def guest_start():
        session["user"] = {
            "id": None,
            "auth_user_id": None,
            "email": None,
            "username": f"guest-{uuid4().hex[:8]}",
            "role": "guest",
            "guest_started_at": datetime.utcnow().isoformat() + "Z",
        }
        return redirect(url_for("discover"))
    

    @app.get("/whoami")
    def whoami():
        print("Current session:", session.get("user"))
        return jsonify(session.get("user") or {})
    
    @app.get("/discover")
    @login_required
    def discover():
        user = session["user"]
        viewer_loc = None

        # Only customers get distance; guests/barbers won’t show it unless you want them to.
        u = session.get("user") or {}
        uid = u.get("id")
        viewer_loc = get_user_location(int(uid)) if uid else None

        return render_template("pages/discover.html", viewer_loc=viewer_loc)
    
    @app.route("/map")
    @login_required
    def map_page():
        u = session.get("user") or {}
        uid = u.get("id")
        loc = get_user_location(int(uid)) if uid else None
        return render_template("pages/map.html", user_location=loc)


    @app.route("/profile")
    @roles_required("customer", "barber")   # guests cannot access
    def profile():
        u = session.get("user") or {}
        uid = u.get("id")
        pstCd = get_user_postcode(int(uid)) if uid else None
        
        # Get user's barbershop if they're a barber
        barbershop_name = None
        if u.get("role") == "barber":
            from .db import get_barber_barbershop
            barber_shop = get_barber_barbershop(int(uid)) if uid else None
            if barber_shop:
                barbershop_name = barber_shop.get("name")
        
        # Get user's profile photo if it exists
        profile_image_url = ""
        if uid:
            profile_photo = get_profile_photo(int(uid))
            if profile_photo and profile_photo.get("image_url"):
                # Generate signed URL for the stored image
                try:
                    profile_image_url = sign_storage_path(profile_photo["image_url"], expires_in=3600)
                except Exception as e:
                    print(f"[PROFILE] Error generating signed URL for photo: {e}")
        
        user_data = {
            "username": u.get("username", ""),
            "email": u.get("email", ""),
            "role": u.get("role", "customer"),
            "profile_image_url": profile_image_url,
            "barbershop_name": barbershop_name,
        }
        
        return render_template("pages/profile.html", user_postcode=pstCd, user_data=user_data)
    

    @app.get("/barber")
    def barber_profile():
        """
        Public route.
        If ?barber_id= is missing, show lookup form.
        If present, show that barber profile.
        """
        barber_id = request.args.get("barber_id", "").strip()

        if not barber_id:
            return render_template("pages/barber_profile.html", barber=None, barber_id=None)

        if not barber_id.isdigit():
            return render_template(
                "pages/barber_profile.html",
                barber=None,
                barber_id=barber_id,
                error="Barber id must be a number.",
            )

        barber = get_barber_public_by_user_id(int(barber_id))
        if not barber:
            return render_template(
                "pages/barber_profile.html",
                barber=None,
                barber_id=barber_id,
                error="No barber found with that id.",
            )

        barber_promo = get_user_promo(int(barber_id))
        shifts = get_shifts_for_barber(int(barber_id))
        current_day = get_current_day_num()
        
        # Calculate closing soon info for today's shifts
        closing_info = {}
        if current_day in shifts and shifts[current_day]:
            # Get the last shift for today
            last_shift = shifts[current_day][-1]
            closing_info = get_closing_soon_info(last_shift["end_time"], current_day)
        
        return render_template(
            "pages/barber_profile.html", 
            barber=barber, 
            barber_promo=barber_promo, 
            shifts=shifts, 
            barber_id=barber_id,
            current_day=current_day,
            closing_info=closing_info
        )


    @app.get("/barber/<int:barber_id>")
    def barber_profile_by_id(barber_id: int):
        """
        Convenience route: /barber/123
        """
        return redirect(url_for("barber_profile", barber_id=barber_id))


    @app.get("/barbershop/<int:barbershop_id>")
    def barbershop_profile(barbershop_id: int):
        """
        Public barbershop profile showing all barbers at this shop.
        """
        shop = get_barbershop_by_id(barbershop_id)
        if not shop:
            return render_template(
                "pages/barbershop_profile.html",
                shop=None,
                error="Barbershop not found."
            )

        opening_hours = get_shop_opening_hours(barbershop_id)
        current_day = get_current_day_num()
        
        # Calculate closing soon info for today
        closing_info = {}
        if current_day in opening_hours:
            closing_info = get_closing_soon_info(opening_hours[current_day]["close"], current_day)
        
        return render_template(
            "pages/barbershop_profile.html", 
            shop=shop, 
            opening_hours=opening_hours,
            current_day=current_day,
            closing_info=closing_info
        )
    

    @app.post("/api/shifts")
    @roles_required("barber")
    def api_add_shift():
        data = request.get_json(silent=True) or {}
        day = data.get("day_of_week")
        start = (data.get("start_time") or "").strip()
        end = (data.get("end_time") or "").strip()

        if day is None or not isinstance(day, int) or not (0 <= day <= 6):
            return jsonify({"error": "day_of_week must be 0-6"}), 400
        if not start or not end:
            return jsonify({"error": "start_time and end_time required"}), 400
        if start >= end:
            return jsonify({"error": "start_time must be before end_time"}), 400

        user_id = int(session["user"]["id"])
        barber_id = get_barber_id_from_user_id(user_id)
        if not barber_id:
            return jsonify({"error": "Barber record not found"}), 404

        shift_id = add_shift(barber_id, day, start, end)
        return jsonify({"ok": True, "shift_id": shift_id}), 201


    @app.delete("/api/shifts/<int:shift_id>")
    @roles_required("barber")
    def api_delete_shift(shift_id: int):
        user_id = int(session["user"]["id"])
        barber_id = get_barber_id_from_user_id(user_id)
        if not barber_id:
            return jsonify({"error": "Barber record not found"}), 404

        deleted = delete_shift(shift_id, barber_id)
        if not deleted:
            return jsonify({"error": "Shift not found or not yours"}), 404
        return jsonify({"ok": True})


    @app.route("/dashboard", methods=["GET", "POST"])
    @roles_required("barber")
    def dashboard():
        user = session["user"]
        user_id = int(user["id"])

        if request.method == "POST":
            username = (request.form.get("username") or "").strip() or None
            postcode = (request.form.get("postcode") or "").strip() or None

            if username and len(username) > 50:
                username = username[:50]
            if postcode and len(postcode) > 10:
                return render_template("pages/dashboard.html", error="Postcode too long.")
            if username:
                err = sanitize_input(username)
                if err:
                    return render_template("pages/dashboard.html", error=err)

            # Allow blanks to mean NULL
            lat_raw = (request.form.get("location_lat") or "").strip()
            lng_raw = (request.form.get("location_lng") or "").strip()

            lat = None
            lng = None
            if lat_raw and lng_raw:
                try:
                    lat = float(lat_raw)
                    lng = float(lng_raw)
                    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                        return render_template("pages/dashboard.html", error="Invalid coordinates.")
                except ValueError:
                    return render_template("pages/dashboard.html", error="Coordinates must be numbers.")

            update_barber_profile(user_id=user_id, username=username, postcode=postcode, lat=lat, lng=lng)

            bio = (request.form.get("bio") or "").strip() or None
            if bio and len(bio) > 500:
                bio = bio[:500]
            update_barber_bio(user_id, bio)

            website = (request.form.get("shop_website") or "").strip() or None
            if website:
                update_barbershop_website(user_id, website)

            social_links = {}
            instagram = (request.form.get("instagram_url") or "").strip()
            tiktok = (request.form.get("tiktok_url") or "").strip()
            if instagram:
                social_links["instagram"] = instagram
            if tiktok:
                social_links["tiktok"] = tiktok
            update_barber_social_links(user_id, social_links)

            return redirect(url_for("dashboard"))

        # For display, reuse public fetch by id (barber-only route so safe)
        barber = get_barber_public_by_user_id(user_id)
        barber_id = get_barber_id_from_user_id(user_id)
        shifts = get_shifts_for_barber(user_id) if barber_id else {}
        return render_template("pages/dashboard.html", barber=barber, shifts=shifts, barber_id=barber_id)
