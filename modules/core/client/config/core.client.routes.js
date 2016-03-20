'use strict';

angular.module('core').config(configFunction);

configFunction.$inject = ['$locationProvider', '$stateProvider', '$urlRouterProvider', '_'];

/* @ngInject */
function configFunction($locationProvider, $stateProvider, $urlRouterProvider, _) {

	$locationProvider.html5Mode(true);

	// Redirect to 404 when route not found
	$urlRouterProvider.otherwise(function ($injector, $location) {
		$injector.get('$state').transitionTo('not-found', null, {
			location: false
		});
	});

	$stateProvider
	.state('configuration', {
		url: '/configuration',
		template: '<tmpl-configuration></tmpl-configuration>',
		data: {
			roles: ['admin']
		}
	})
	.state('login', {
		url: '/login',
		template: '<tmpl-login></tmpl-login>'
	})
	.state('register', {
		url: '/register',
		template: '<tmpl-register></tmpl-register>'
	})
	.state('recover', {
		url: '/recover',
		template: '<tmpl-recover></tmpl-recover>'
	})
	// =========================================================================
	//
	// Old Project Routes
	//
	// =========================================================================
	// .state('project', {
	// 	url: '/project/:id',
	// 	template: '<tmpl-project></tmpl-project>'
	// })
	// =========================================================================
	//
	// New Project Routes
	//
	// =========================================================================
	.state('projects', {
		url: '/',
		templateUrl: 'modules/projects/client/views/projects.abstract.html',
		resolve: {
			projects: function ($stateParams, ProjectModel) {
				return ProjectModel.getCollection ();
			}
		},
		controller: function ($scope, $stateParams, projects, ENV, Authentication) {
			$scope.projects = projects;
			$scope.environment = ENV;
			$scope.authentication = Authentication;
		}
	})
	// -------------------------------------------------------------------------
	//
	// the scheudle view for all projects
	//
	// -------------------------------------------------------------------------
	.state('projects.schedule', {
		url: '/schedule',
		templateUrl: 'modules/projects/client/views/projects-partials/projects.schedule.html',
		controller: function ($scope, projects) {
			$scope.projects = projects;
		}
	})
	// -------------------------------------------------------------------------
	//
	// the project abstract, this contains the menu and a ui-view for loading
	// child views. it also handles injecting the project
	//
	// -------------------------------------------------------------------------
	.state ('newproject', {
		url: '/newproject',
		abstract: false,
		template:'<p></p>',
		resolve: {
			project: function (ProjectModel, Authentication, _ ) {
					var code = Authentication.user.username + '-' + 'newproject' + '-' + _.random (0,1000);
					return ProjectModel.getNewWithCode (code);
			}
		},
		controller: function ($state, project) {
			console.log ('new project =' , project);
			$state.go ('p.edit', {projectid:project.code,project:project.code});
		}
	})
	.state('p', {
		url: '/p/:projectid',
		abstract: true,
		templateUrl: 'modules/projects/client/views/project.abstract.html',
		resolve: {
			project: function ($stateParams, ProjectModel) {
				return ProjectModel.byCode ($stateParams.projectid);
			},
			eaoAdmin: function (project) {
				return project.adminRole;
			},
			proponentAdmin: function (project) {
				return project.proponentAdminRole;
			}
		},
		controller: function ($scope, $stateParams, project, ENV) {
			$scope.project = project;
			$scope.environment = ENV;
		}
	})
	// -------------------------------------------------------------------------
	//
	// the detail view of a project
	//
	// -------------------------------------------------------------------------
	.state('p.detail', {
		url: '/detail',
		templateUrl: 'modules/projects/client/views/project-partials/project.detail.html',
		controller: function ($scope, project) {
			$scope.project = project;
		}
	})
	// -------------------------------------------------------------------------
	//
	// the detail view of a project
	//
	// -------------------------------------------------------------------------
	.state('p.edit', {
		url: '/edit',
		templateUrl: 'modules/projects/client/views/project-partials/project.entry.html',
		controller: 'controllerProjectEntry',
		resolve: {
			intakeQuestions: function(ProjectModel) {
				return ProjectModel.getProjectIntakeQuestions();
			}
		}
	})
	// -------------------------------------------------------------------------
	//
	// project description
	//
	// -------------------------------------------------------------------------
	.state('projectdescription', {
		url: '/projectdescription/:project',
		template: '<tmpl-project-description-edit></tmpl-project-description-edit>',
		data: {
			roles: ['admin', 'user']
		}
	})
	.state('comments', {
		url: '/comments/:project',
		template: '<tmpl-comment-period-list></tmpl-comment-period-list>',
		data: {
			roles: ['admin', 'user']
		}
	})
	.state('activity', {
		url: '/project/:project/activity/:activity',
		template: '<tmpl-activity></tmpl-activity>',
		data: {
			roles: ['admin', 'user']
		}
	})
	.state('activities', {
		url: '/activities',
		templateUrl: 'modules/users/client/views/user-partials/user-activities.html',
		resolve: {
			activities: function(ActivityModel) {
				return ActivityModel.userActivities ();
			},
			projects: function(ProjectModel) {
				return ProjectModel.lookup ();
			}
		},
		controller: function ($scope, $stateParams, activities, projects, NgTableParams) {
			$scope.projects = projects;
			_.map(activities, function(item) {
				item.project = projects[item.project].name;
			});
			$scope.tableParams = new NgTableParams ({count:50}, {dataset: activities});
		},
		data: {
			roles: ['admin', 'user']
		}
	});





	// Home state routing
	$stateProvider
	.state('not-found', {
		url: '/not-found',
		templateUrl: 'modules/core/client/views/404.client.view.html',
		data: {
			ignoreState: true
		}
	})
	.state('bad-request', {
		url: '/bad-request',
		templateUrl: 'modules/core/client/views/400.client.view.html',
		data: {
			ignoreState: true
		}
	})
	.state('forbidden', {
		url: '/forbidden',
		templateUrl: 'modules/core/client/views/403.client.view.html',
		data: {
			ignoreState: true
		}
	});

}











