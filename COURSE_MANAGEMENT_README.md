# Course Management System for HexaBoard

This document explains how to use the course management system that allows admins to add courses for individual freshers in your Firebase application.

## Overview

The course management system consists of two main components:
1. **Admin Course Management** - Allows admins to assign courses to individual freshers
2. **Fresher Course View** - Allows freshers to view and interact with their assigned courses

## Firebase Database Structure

The courses are stored in the following structure:
```
users/
  {fresherId}/
    courses/
      {courseId}/
        - title: string
        - description: string
        - instructor: string
        - duration: string
        - level: string (Beginner/Intermediate/Advanced)
        - category: string
        - status: string (active/paused/completed)
        - progress: number
        - createdAt: timestamp
        - updatedAt: timestamp
        - enrolledAt: timestamp
        - modules: array
          - id: number
          - title: string
          - description: string
          - lessons: array
            - id: number
            - title: string
            - description: string
            - duration: string
            - videoUrl: string
            - completed: boolean
            - progress: number
```

## Admin Features

### Course Management Interface
- **Location**: Admin Dashboard → Course Management tab
- **Features**:
  - Select individual freshers from dropdown
  - Add new courses with detailed information
  - Create modules and lessons within courses
  - Update course status (active/paused/completed)
  - Delete courses
  - View all courses assigned to a fresher

### How to Add a Course for a Fresher

1. **Navigate to Course Management**:
   - Go to Admin Dashboard
   - Click on "Course Management" in the sidebar

2. **Select a Fresher**:
   - Use the dropdown to select the fresher you want to assign courses to
   - Only freshers will appear in the dropdown

3. **Add a New Course**:
   - Click the "+ Add New Course" button
   - Fill in the course details:
     - Course Title
     - Description
     - Instructor
     - Duration
     - Level (Beginner/Intermediate/Advanced)
     - Category

4. **Add Modules and Lessons**:
   - Add modules to organize course content
   - For each module, add lessons with:
     - Lesson title
     - Duration
     - Video URL (optional)
   - Click "Add Lesson" to add lessons to the current module
   - Click "Add Module" to add the module to the course

5. **Save the Course**:
   - Click "Save Course" to create the course for the selected fresher
   - The course will be immediately available to the fresher

### Course Management Actions

- **Update Status**: Change course status using the dropdown in each course card
- **Delete Course**: Remove courses using the delete button
- **View Details**: See all modules and lessons for each course

## Fresher Features

### My Courses Interface
- **Location**: Fresher Dashboard → My Courses tab
- **Features**:
  - View all assigned courses
  - See course progress with visual indicators
  - Mark lessons as completed
  - Access video content (if provided)
  - Track module and course progress

### How Freshers Use Their Courses

1. **View Assigned Courses**:
   - Navigate to "My Courses" in the fresher dashboard
   - See all courses assigned by admin
   - View progress indicators for each course

2. **Access Course Content**:
   - Click "View Course" to see detailed course information
   - Browse through modules and lessons
   - Mark lessons as completed when finished

3. **Track Progress**:
   - Visual progress indicators show completion percentage
   - Module progress bars show individual module completion
   - Course status shows if course is active, paused, or completed

## API Functions

The system includes a comprehensive service layer (`courseService.js`) with the following functions:

### Admin Functions
- `addCourseForFresher(fresherId, courseData)` - Add course to specific fresher
- `getAllFreshers()` - Get list of all freshers
- `updateCourseStatus(fresherId, courseId, status)` - Update course status
- `deleteCourse(fresherId, courseId)` - Delete a course
- `bulkAddCoursesToFreshers(fresherIds, courseData)` - Add course to multiple freshers
- `getCourseStatistics()` - Get overall course statistics

### Fresher Functions
- `getCoursesForFresher(fresherId)` - Get courses for a fresher
- `listenToCoursesForFresher(fresherId, callback)` - Real-time course updates
- `updateLessonCompletion(fresherId, courseId, moduleId, lessonId, completed)` - Mark lesson complete

### Utility Functions
- `calculateCourseProgress(course)` - Calculate overall course progress
- `calculateModuleProgress(module)` - Calculate module progress

## Security Rules

Make sure your Firebase security rules allow:
- Admins to read/write all user data
- Freshers to read/write their own course data
- Real-time updates for course progress

Example Firestore rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      match /courses/{courseId} {
        allow read, write: if request.auth != null && 
          (request.auth.uid == userId || 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      }
    }
  }
}
```

## Usage Examples

### Adding a Course for a Fresher
```javascript
import { courseService } from './services/courseService';

const courseData = {
  title: "React Fundamentals",
  description: "Learn the basics of React development",
  instructor: "John Doe",
  duration: "10 hours",
  level: "Beginner",
  category: "Web Development",
  modules: [
    {
      id: 1,
      title: "Introduction to React",
      description: "Basic concepts and setup",
      lessons: [
        {
          id: 1,
          title: "What is React?",
          duration: "30 min",
          videoUrl: "https://example.com/video1",
          completed: false,
          progress: 0
        }
      ]
    }
  ]
};

await courseService.addCourseForFresher('fresherUserId', courseData);
```

### Getting Course Statistics
```javascript
const stats = await courseService.getCourseStatistics();
console.log(`Total courses: ${stats.totalCourses}`);
console.log(`Active courses: ${stats.activeCourses}`);
console.log(`Average progress: ${stats.averageProgress}%`);
```

## Troubleshooting

### Common Issues

1. **Courses not appearing for freshers**:
   - Check if the fresher is properly authenticated
   - Verify the course was added to the correct user ID
   - Check Firebase security rules

2. **Progress not updating**:
   - Ensure the lesson completion function is called correctly
   - Check if the course document exists in Firestore
   - Verify the module and lesson IDs match

3. **Admin cannot see freshers**:
   - Ensure the user has admin role in Firebase
   - Check if freshers have the correct role field set to 'fresher'

### Debug Tips

- Use browser console to check for Firebase errors
- Verify Firestore rules allow the operations
- Check network tab for failed requests
- Use Firebase console to manually verify data structure

## Future Enhancements

Potential improvements for the course management system:
- Course templates for quick assignment
- Bulk course assignment to multiple freshers
- Course completion certificates
- Advanced progress analytics
- Course ratings and reviews
- Integration with external video platforms
- Course prerequisites and dependencies 