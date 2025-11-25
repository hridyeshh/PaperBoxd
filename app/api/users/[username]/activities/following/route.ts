import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Book from "@/lib/db/models/Book";
import { auth } from "@/lib/auth";

/**
 * Get activities from users that the logged-in user follows
 *
 * GET /api/users/[username]/activities/following?page=1&pageSize=20
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const session = await auth();

    if (!session?.user?.email) {
      console.log(`[AUTH ERROR] No session for ${username}. Session:`, session);
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    console.log(`[AUTH] User ${session.user.email} requesting activities for ${username}`);

    // Connect to database
    await connectDB();

    // Find the logged-in user (explicitly include activities, following, and username)
    const currentUser = await User.findOne({ email: session.user.email })
      .select("activities following username");

    if (!currentUser) {
      console.log(`[AUTH ERROR] User not found in DB for email: ${session.user.email}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the username in the URL matches the logged-in user's username
    // Use the database username as the source of truth
    const currentUsername = currentUser.username?.toLowerCase().trim();
    const requestedUsername = username?.toLowerCase().trim();

    console.log(`[AUTH] Comparing usernames: current="${currentUsername}" vs requested="${requestedUsername}"`);
    
    // If user doesn't have a username set, or usernames don't match, return 403
    if (!currentUsername) {
      console.error("User has no username set:", {
        email: session.user.email,
        requestedUsername,
      });
      return NextResponse.json(
        { error: "User must have a username set to view activities" },
        { status: 403 }
      );
    }
    
    if (currentUsername !== requestedUsername) {
      console.error("Username mismatch:", {
        currentUsername,
        requestedUsername,
        sessionEmail: session.user.email,
        sessionUsername: session.user.username,
      });
      return NextResponse.json(
        { error: "Unauthorized - Can only fetch your own following activities" },
        { status: 403 }
      );
    }

    // Get following IDs
    const followingIds = currentUser.following || [];

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Fetch activities from all followed users (only if following someone)
    const followedUsers = followingIds.length > 0
      ? await User.find({
      _id: { $in: followingIds },
    })
      .select("_id username name avatar activities diaryEntries")
          .lean()
      : [];

    // Collect all activities from followed users
    const allActivities: any[] = [];

    // First, add activities that were shared TO the current user (shared_list activities in current user's activities)
    const currentUserActivities = Array.isArray(currentUser.activities) ? currentUser.activities : [];
    console.log(`[DEBUG ${username}] Current user has ${currentUserActivities.length} total activities`);
    console.log(`[DEBUG ${username}] Activity types: ${JSON.stringify(currentUserActivities.map(a => a.type))}`);

    const sharedListActivities = currentUserActivities.filter((activity: any) =>
      activity.type === "shared_list"
    );
    console.log(`[DEBUG ${username}] Found ${sharedListActivities.length} shared_list activities`);
    if (sharedListActivities.length > 0) {
      console.log(`[DEBUG ${username}] Shared list details: ${JSON.stringify(sharedListActivities.map(a => ({
        listId: a.listId,
        sharedByUsername: a.sharedByUsername,
        hasTimestamp: !!a.timestamp
      })))}`);
    }


    // Get unique usernames of people who shared lists
    const sharedByUsernames = [...new Set(sharedListActivities.map((a: any) => a.sharedByUsername).filter(Boolean))];
    
    // Fetch user info for people who shared lists (even if not followed)
    const sharedByUsers = sharedByUsernames.length > 0
      ? await User.find({ username: { $in: sharedByUsernames } })
          .select("_id username name avatar")
          .lean()
      : [];
    
    sharedListActivities.forEach((activity: any) => {
      // For shared_list activities, the username should be the person who shared it
      // Convert Mongoose subdocument to plain object
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        listId: activity.listId,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      if (activityObj.sharedByUsername) {
        // Find the user who shared it to get their avatar and name
        const sharedByUser = sharedByUsers.find((u: any) => u.username === activityObj.sharedByUsername) ||
                            followedUsers.find((u: any) => u.username === activityObj.sharedByUsername);
        const activityToAdd = {
          ...activityObj,
          userId: activityObj.sharedBy?.toString() || (currentUser._id as any)?.toString() || '',
          username: activityObj.sharedByUsername,
          userName: sharedByUser?.name || activityObj.sharedByUsername,
          userAvatar: sharedByUser?.avatar,
        };
        console.log(`[DEBUG ${username}] Adding shared_list activity - type: ${activityToAdd.type}, timestamp: ${activityToAdd.timestamp}`);
        allActivities.push(activityToAdd);
      } else {
        console.log(`[DEBUG ${username}] SKIPPING shared_list activity - no sharedByUsername`);
      }
    });

    console.log(`[DEBUG ${username}] After adding shared_list: allActivities.length = ${allActivities.length}, shared_list count = ${allActivities.filter((a: any) => a.type === 'shared_list').length}`);

    // Add shared_book activities from current user's activities
    const sharedBookActivities = currentUserActivities.filter((activity: any) =>
      activity.type === "shared_book"
    );
    console.log(`[DEBUG ${username}] Found ${sharedBookActivities.length} shared_book activities`);

    // Get unique usernames of people who shared books
    const sharedBookByUsernames = [...new Set(sharedBookActivities.map((a: any) => a.sharedByUsername).filter(Boolean))];
    
    // Fetch user info for people who shared books (even if not followed)
    const sharedBookByUsers = sharedBookByUsernames.length > 0
      ? await User.find({ username: { $in: sharedBookByUsernames } })
          .select("_id username name avatar")
          .lean()
      : [];
    
    sharedBookActivities.forEach((activity: any) => {
      // For shared_book activities, the username should be the person who shared it
      // Convert Mongoose subdocument to plain object
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        bookId: activity.bookId,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      if (activityObj.sharedByUsername) {
        // Find the user who shared it to get their avatar and name
        const sharedByUser = sharedBookByUsers.find((u: any) => u.username === activityObj.sharedByUsername) ||
                            followedUsers.find((u: any) => u.username === activityObj.sharedByUsername);
        const activityToAdd = {
          ...activityObj,
          userId: activityObj.sharedBy?.toString() || (currentUser._id as any)?.toString() || '',
          username: activityObj.sharedByUsername,
          userName: sharedByUser?.name || activityObj.sharedByUsername,
          userAvatar: sharedByUser?.avatar,
        };
        console.log(`[DEBUG ${username}] Adding shared_book activity - type: ${activityToAdd.type}, timestamp: ${activityToAdd.timestamp}`);
        allActivities.push(activityToAdd);
      } else {
        console.log(`[DEBUG ${username}] SKIPPING shared_book activity - no sharedByUsername`);
      }
    });

    console.log(`[DEBUG ${username}] After adding shared_book: allActivities.length = ${allActivities.length}, shared_book count = ${allActivities.filter((a: any) => a.type === 'shared_book').length}`);

    // Add collaboration_request activities from current user's activities
    const collaborationRequestActivities = currentUserActivities.filter((activity: any) =>
      activity.type === "collaboration_request"
    );
    console.log(`[DEBUG ${username}] Found ${collaborationRequestActivities.length} collaboration_request activities`);

    // Get unique usernames of people who sent collaboration requests
    const collaborationSenderUsernames = [...new Set(collaborationRequestActivities.map((a: any) => a.sharedByUsername).filter(Boolean))];

    // Fetch user info for people who sent collaboration requests
    const collaborationSenderUsers = collaborationSenderUsernames.length > 0
      ? await User.find({ username: { $in: collaborationSenderUsernames } })
          .select("_id username name avatar")
          .lean()
      : [];

    collaborationRequestActivities.forEach((activity: any) => {
      // Convert Mongoose subdocument to plain object
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        listId: activity.listId,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };

      if (activityObj.sharedByUsername) {
        // Find the user who sent the request
        const senderUser = collaborationSenderUsers.find((u: any) => u.username === activityObj.sharedByUsername) ||
                          followedUsers.find((u: any) => u.username === activityObj.sharedByUsername);
        const activityToAdd = {
          ...activityObj,
          userId: activityObj.sharedBy?.toString() || '',
          username: activityObj.sharedByUsername,
          userName: senderUser?.name || activityObj.sharedByUsername,
          userAvatar: senderUser?.avatar,
        };
        console.log(`[DEBUG ${username}] Adding collaboration_request activity - type: ${activityToAdd.type}, timestamp: ${activityToAdd.timestamp}`);
        allActivities.push(activityToAdd);
      } else {
        console.log(`[DEBUG ${username}] SKIPPING collaboration_request activity - no sharedByUsername`);
      }
    });

    console.log(`[DEBUG ${username}] After adding collaboration_request: allActivities.length = ${allActivities.length}, collaboration_request count = ${allActivities.filter((a: any) => a.type === 'collaboration_request').length}`);

    // Add granted_access activities from current user's activities
    const grantedAccessActivities = currentUserActivities.filter((activity: any) =>
      activity.type === "granted_access"
    );
    console.log(`[DEBUG ${username}] Found ${grantedAccessActivities.length} granted_access activities`);

    // Get unique usernames of people who granted access
    const grantedAccessByUsernames = [...new Set(grantedAccessActivities.map((a: any) => a.sharedByUsername).filter(Boolean))];
    
    // Fetch user info for people who granted access (even if not followed)
    const grantedAccessByUsers = grantedAccessByUsernames.length > 0
      ? await User.find({ username: { $in: grantedAccessByUsernames } })
          .select("_id username name avatar")
          .lean()
      : [];
    
    grantedAccessActivities.forEach((activity: any) => {
      // Convert Mongoose subdocument to plain object
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        listId: activity.listId,
        listTitle: activity.listTitle,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      if (activityObj.sharedByUsername) {
        // Find the user who granted access
        const grantedByUser = grantedAccessByUsers.find((u: any) => u.username === activityObj.sharedByUsername) ||
                              followedUsers.find((u: any) => u.username === activityObj.sharedByUsername);
        const activityToAdd = {
          ...activityObj,
          userId: activityObj.sharedBy?.toString() || '',
          username: activityObj.sharedByUsername,
          userName: grantedByUser?.name || activityObj.sharedByUsername,
          userAvatar: grantedByUser?.avatar,
        };
        console.log(`[DEBUG ${username}] Adding granted_access activity - type: ${activityToAdd.type}, timestamp: ${activityToAdd.timestamp}`);
        allActivities.push(activityToAdd);
      } else {
        console.log(`[DEBUG ${username}] SKIPPING granted_access activity - no sharedByUsername`);
      }
    });

    console.log(`[DEBUG ${username}] After adding granted_access: allActivities.length = ${allActivities.length}, granted_access count = ${allActivities.filter((a: any) => a.type === 'granted_access').length}`);

    // Add liked_diary_entry activities from current user's activities
    const likedDiaryEntryActivities = currentUserActivities.filter((activity: any) =>
      activity.type === "liked_diary_entry"
    );
    console.log(`[DEBUG ${username}] Found ${likedDiaryEntryActivities.length} liked_diary_entry activities`);

    // Get unique usernames of people who liked diary entries
    const likedByUsernames = [...new Set(likedDiaryEntryActivities.map((a: any) => a.sharedByUsername).filter(Boolean))];
    
    // Fetch user info for people who liked diary entries (even if not followed)
    const likedByUsers = likedByUsernames.length > 0
      ? await User.find({ username: { $in: likedByUsernames } })
          .select("_id username name avatar")
          .lean()
      : [];
    
    likedDiaryEntryActivities.forEach((activity: any) => {
      // Convert Mongoose subdocument to plain object
      const activityObj = activity.toObject ? activity.toObject() : {
        _id: activity._id,
        type: activity.type,
        diaryEntryId: activity.diaryEntryId,
        subject: activity.subject,
        sharedBy: activity.sharedBy,
        sharedByUsername: activity.sharedByUsername,
        timestamp: activity.timestamp,
      };
      
      if (activityObj.sharedByUsername) {
        // Find the user who liked it to get their avatar and name
        const likedByUser = likedByUsers.find((u: any) => u.username === activityObj.sharedByUsername) ||
                            followedUsers.find((u: any) => u.username === activityObj.sharedByUsername);
        const activityToAdd = {
          ...activityObj,
          userId: activityObj.sharedBy?.toString() || '',
          username: activityObj.sharedByUsername,
          userName: likedByUser?.name || activityObj.sharedByUsername,
          userAvatar: likedByUser?.avatar,
        };
        console.log(`[DEBUG ${username}] Adding liked_diary_entry activity - type: ${activityToAdd.type}, timestamp: ${activityToAdd.timestamp}`);
        allActivities.push(activityToAdd);
      } else {
        console.log(`[DEBUG ${username}] SKIPPING liked_diary_entry activity - no sharedByUsername`);
      }
    });

    console.log(`[DEBUG ${username}] After adding liked_diary_entry: allActivities.length = ${allActivities.length}, liked_diary_entry count = ${allActivities.filter((a: any) => a.type === 'liked_diary_entry').length}`);

    followedUsers.forEach((user: any) => {
      // Add regular activities (excluding shared_list, shared_book, collaboration_request, granted_access, and liked_diary_entry as those are handled above)
      const activities = Array.isArray(user.activities) ? user.activities : [];
      // Filter out any search-related activities, shared_list, shared_book, collaboration_request, granted_access, and liked_diary_entry (handled separately)
      const filteredActivities = activities.filter((activity: any) => 
        activity.type !== "search" &&
        activity.type !== "shared_list" &&
        activity.type !== "shared_book" &&
        activity.type !== "collaboration_request" &&
        activity.type !== "granted_access" &&
        activity.type !== "liked_diary_entry"
      );
      filteredActivities.forEach((activity: any) => {
        // Convert Mongoose subdocument to plain object
        const activityObj = activity.toObject ? activity.toObject() : {
          _id: activity._id,
          type: activity.type,
          bookId: activity.bookId,
          rating: activity.rating,
          review: activity.review,
          timestamp: activity.timestamp,
        };
        allActivities.push({
          ...activityObj,
          userId: user._id.toString(),
          username: user.username,
          userName: user.name || user.username,
          userAvatar: user.avatar,
        });
      });

      // Add diary entries as activities
      const diaryEntries = Array.isArray(user.diaryEntries) ? user.diaryEntries : [];
      diaryEntries.forEach((entry: any) => {
        const entryDate = entry.updatedAt ? new Date(entry.updatedAt) : (entry.createdAt ? new Date(entry.createdAt) : new Date());
        const isGeneralEntry = !entry.bookId;
        allActivities.push({
          _id: entry._id?.toString() || entry._id,
          type: "diary_entry",
          timestamp: entryDate,
          bookId: entry.bookId?.toString() || entry.bookId || null,
          bookTitle: entry.bookTitle || (isGeneralEntry ? null : "Unknown Book"),
          bookAuthor: entry.bookAuthor || (isGeneralEntry ? null : "Unknown Author"),
          bookCover: entry.bookCover || (isGeneralEntry ? null : undefined),
          subject: entry.subject || null, // Include subject for general entries
          diaryEntryId: entry._id?.toString() || entry._id,
          content: entry.content || "",
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          likes: entry.likes || [],
          userId: user._id.toString(),
          username: user.username,
          userName: user.name || user.username,
          userAvatar: user.avatar,
          isGeneralEntry, // Flag to indicate this is a general entry
        });
      });
    });

    console.log(`[DEBUG ${username}] Before sorting: allActivities.length = ${allActivities.length}, shared_list count = ${allActivities.filter((a: any) => a.type === 'shared_list').length}`);

    // Sort by timestamp (newest first)
    allActivities.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    console.log(`[DEBUG ${username}] After sorting: allActivities.length = ${allActivities.length}, shared_list count = ${allActivities.filter((a: any) => a.type === 'shared_list').length}`);

    // Apply pagination
    const total = allActivities.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedActivities = allActivities.slice(startIndex, endIndex);

    // Populate activities with book/list information and add like info for diary entries
    const currentUserId = (currentUser._id as any)?.toString() || '';
    const activitiesWithBooks = await Promise.all(
      paginatedActivities.map(async (activity: any) => {
        // For diary entries, add like information
        if (activity.type === "diary_entry") {
          const likesArray = activity.likes || [];
          const isLiked = currentUserId ? likesArray.some((id: any) => id.toString() === currentUserId) : false;
          return {
            ...activity,
            isLiked,
            likesCount: likesArray.length,
          };
        }

        // For shared_list, collaboration_request, and granted_access activities, populate list information
        if ((activity.type === "shared_list" || activity.type === "collaboration_request" || activity.type === "granted_access") && activity.listId && activity.sharedByUsername) {
          try {
            const sharedByUser = await User.findOne({ username: activity.sharedByUsername })
              .select("readingLists")
              .populate({
                path: "readingLists.books",
                model: Book,
                select: "volumeInfo",
                options: { limit: 1 }, // Only populate first book for cover
              })
              .lean();
            
            if (sharedByUser) {
              const sharedList = sharedByUser.readingLists?.find(
                (l: any) => l._id?.toString() === activity.listId
              );
              
              if (sharedList) {
                // Get cover from first book if available
                let listCover = undefined;
                if (sharedList.books && sharedList.books.length > 0) {
                  const firstBookItem = sharedList.books[0];
                  
                  // Check if book is populated (has volumeInfo property)
                  if (firstBookItem && typeof firstBookItem === 'object' && 'volumeInfo' in firstBookItem) {
                    // Book is populated, use the populated data
                    const populatedBook = firstBookItem as any;
                    if (populatedBook.volumeInfo) {
                      listCover = populatedBook.volumeInfo?.imageLinks?.thumbnail ||
                                 populatedBook.volumeInfo?.imageLinks?.smallThumbnail ||
                                 populatedBook.volumeInfo?.imageLinks?.medium;
                    }
                  } else {
                    // Book is not populated, fetch it by ID
                    const firstBookId = typeof firstBookItem === 'string' 
                      ? firstBookItem 
                      : (firstBookItem as any)?._id?.toString() || firstBookItem?.toString();
                    
                    if (firstBookId) {
                      const fetchedBook = await Book.findById(firstBookId).lean();
                      if (fetchedBook && fetchedBook.volumeInfo) {
                        listCover = fetchedBook.volumeInfo?.imageLinks?.thumbnail ||
                                   fetchedBook.volumeInfo?.imageLinks?.smallThumbnail ||
                                   fetchedBook.volumeInfo?.imageLinks?.medium;
                      }
                    }
                  }
                }
                
                return {
                  ...activity,
                  listTitle: sharedList.title,
                  listDescription: sharedList.description,
                  listCover: listCover || "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80",
                  listBooksCount: Array.isArray(sharedList.books) ? sharedList.books.length : 0,
                };
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch list for ${activity.type} activity ${activity._id}:`, error);
          }
        }

        // For shared_book activities, populate book information
        if (activity.type === "shared_book" && activity.bookId) {
          try {
            // Convert bookId to ObjectId if it's a string
            const bookId = activity.bookId?.toString ? activity.bookId.toString() : activity.bookId;
            const book = await Book.findById(bookId).lean();
            if (book) {
              return {
                ...activity,
                bookTitle: book.volumeInfo?.title || activity.bookTitle || undefined,
                bookCover: book.volumeInfo?.imageLinks?.thumbnail || 
                          book.volumeInfo?.imageLinks?.smallThumbnail ||
                          book.volumeInfo?.imageLinks?.medium ||
                          activity.bookCover ||
                          undefined,
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch book for shared_book activity ${activity._id}:`, error);
          }
        }

        // For regular activities, populate book information
        if (activity.bookId && activity.type !== "shared_book") {
          try {
            // Convert bookId to ObjectId if it's a string
            const bookId = activity.bookId?.toString ? activity.bookId.toString() : activity.bookId;
            const book = await Book.findById(bookId).lean();
            if (book) {
              return {
                ...activity,
                bookTitle: book.volumeInfo?.title || activity.bookTitle || undefined,
                bookCover: book.volumeInfo?.imageLinks?.thumbnail || 
                          book.volumeInfo?.imageLinks?.smallThumbnail ||
                          book.volumeInfo?.imageLinks?.medium ||
                          activity.bookCover ||
                          undefined,
              };
            }
          } catch (error) {
            console.warn(`Failed to fetch book for activity ${activity._id}:`, error);
          }
        }
        return activity;
      })
    );

    const finalSharedListCount = activitiesWithBooks.filter((a: any) => a.type === 'shared_list').length;
    const finalCollabRequestCount = activitiesWithBooks.filter((a: any) => a.type === 'collaboration_request').length;
    console.log(`[${username}] Returning ${activitiesWithBooks.length} activities (${finalSharedListCount} shared_list, ${finalCollabRequestCount} collaboration_request)`);

    return NextResponse.json({
      activities: activitiesWithBooks,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Following activities fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch following activities",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

